import { z } from 'zod';
import { t, type Locale } from './i18n';
import type { ClassifyResult, NextAction } from './types/classify';

/** Internal observations, extracted in the same call as classification. */
export const BeverageEvidenceSchema = z.object({
  /** Product identity is independent of whether the photo establishes package geometry. */
  beverage_product: z.enum(['prepackaged_beverage', 'other', 'unclear']),
  /** Count visible physical product containers, excluding bags and other wrapping layers. */
  visible_container_count: z.enum(['one', 'multiple', 'unclear']),
  subject: z.enum(['single_prepackaged_beverage_container', 'other', 'unclear']),
  /** Whether enough of the object is visible to establish its physical container form. */
  whole_container_visible: z.boolean(),
  form: z.enum(['bottle', 'can', 'carton', 'pouch', 'cup', 'other', 'unknown']),
  material: z.enum(['plastic', 'metal', 'glass', 'paper', 'composite', 'other', 'unknown']),
  volume_ml: z.number().positive().nullable(),
  deposit_mark: z.enum(['singapore', 'absent', 'foreign', 'unverified']),
  /** Exact text actually supplied by the user or read from the mark; empty when unreadable. */
  deposit_mark_text: z.string(),
  mark_on_subject_container: z.boolean(),
  linear_barcode_on_subject: z.boolean(),
  /** Observed crushing, severe container damage or damaged product barcode. */
  damaged: z.boolean(),
  /** Visible dirt, grease or non-beverage residue that makes ordinary recycling unsafe. */
  contaminated: z.boolean(),
});

export type BeverageEvidence = z.infer<typeof BeverageEvidenceSchema>;
export const BEVERAGE_EVIDENCE_JSON_SCHEMA = z.toJSONSchema(BeverageEvidenceSchema, { target: 'draft-7' });

export type BeverageInputMode = 'text' | 'image';

const isEligibleContainerForm = (evidence: BeverageEvidence) =>
  evidence.form === 'bottle' || evidence.form === 'can' || evidence.form === 'cup';

const isPlasticOrMetal = (evidence: BeverageEvidence) =>
  evidence.material === 'plastic' || evidence.material === 'metal';

const volumeCanQualify = (evidence: BeverageEvidence) =>
  evidence.volume_ml === null || (evidence.volume_ml >= 150 && evidence.volume_ml <= 3000);

/** Conditional guidance requires evidence that the user presented one container. */
const isSingleBeverageCandidate = (evidence: BeverageEvidence) =>
  (evidence.subject === 'single_prepackaged_beverage_container'
    && evidence.beverage_product !== 'other'
    && evidence.visible_container_count !== 'multiple')
  || (evidence.beverage_product === 'prepackaged_beverage'
    && evidence.visible_container_count === 'one'
    && evidence.subject !== 'other');

export function hasReadableSingaporeMarkText(text: string): boolean {
  const normalized = text.toUpperCase();
  const compact = normalized.replace(/\s+/g, '');
  return compact.includes('10¢') && /\bSG\b/.test(normalized) && /\bRETURN\b/.test(normalized);
}

/** A model label alone is not evidence that a blurred mark belongs to another scheme. */
export function hasExplicitForeignDepositText(evidence: BeverageEvidence): boolean {
  if (evidence.deposit_mark !== 'foreign' || hasReadableSingaporeMarkText(evidence.deposit_mark_text)) {
    return false;
  }
  return /\bCA\s+CRV\b/i.test(evidence.deposit_mark_text)
    || /\b(refund|deposit|collection|depot|participating|territor(?:y|ies)|pfand|pant|retur)\b/i
      .test(evidence.deposit_mark_text);
}

function effectiveDepositMark(evidence: BeverageEvidence, mode: BeverageInputMode) {
  if (evidence.deposit_mark === 'singapore') {
    return mode === 'text' || hasReadableSingaporeMarkText(evidence.deposit_mark_text)
      ? 'singapore' as const
      : 'unverified' as const;
  }
  if (evidence.deposit_mark === 'foreign') {
    return hasExplicitForeignDepositText(evidence) ? 'foreign' as const : 'unverified' as const;
  }
  // A single photograph can establish a visible mark, but cannot prove that no mark
  // exists anywhere on the object. Explicit text can make that claim.
  if (evidence.deposit_mark === 'absent' && mode === 'image') return 'unverified' as const;
  return evidence.deposit_mark;
}

export function hasConfirmedReturnEvidence(evidence: BeverageEvidence, mode: BeverageInputMode) {
  return evidence.beverage_product === 'prepackaged_beverage'
    && evidence.visible_container_count === 'one'
    && evidence.subject === 'single_prepackaged_beverage_container'
    && isEligibleContainerForm(evidence)
    && isPlasticOrMetal(evidence)
    && volumeCanQualify(evidence)
    && effectiveDepositMark(evidence, mode) === 'singapore'
    && evidence.mark_on_subject_container
    && evidence.linear_barcode_on_subject
    && !evidence.damaged
    && !evidence.contaminated;
}

function toUnconfirmed(result: ClassifyResult): ClassifyResult {
  const classification = { ...result };
  delete classification.next_action;
  return {
    ...classification,
    status: 'not_sure',
    channel: null,
    confidence: Math.min(result.confidence, 0.49),
  };
}

/**
 * Resolve model observations into a classification and a useful user action.
 * The model identifies visual facts; application code owns channel safety and copy.
 */
export function applyBeverageActionPolicy(
  result: ClassifyResult,
  evidence: BeverageEvidence,
  locale: Locale,
  mode: BeverageInputMode,
): ClassifyResult {
  let classification = { ...result };
  delete classification.next_action;

  const confirmedReturn = hasConfirmedReturnEvidence(evidence, mode);
  // The application derives the channel from verified facts. This also recovers a
  // conservative model answer once independent image checks confirm the evidence.
  if (confirmedReturn) {
    classification = {
      ...classification,
      status: 'recyclable',
      channel: 'return_point',
    };
  } else if (classification.channel === 'return_point') {
    classification = toUnconfirmed(classification);
  }

  // Once form, material and cleanliness are established, a glass beverage bottle
  // has a deterministic Singapore channel. Do not preserve a probabilistic model
  // guess that sends the same observed object to general waste.
  const cleanGlassBottle = evidence.beverage_product === 'prepackaged_beverage'
    && evidence.visible_container_count === 'one'
    && evidence.subject === 'single_prepackaged_beverage_container'
    && evidence.form === 'bottle'
    && evidence.material === 'glass'
    && !evidence.damaged
    && !evidence.contaminated;
  if (cleanGlassBottle && (classification.channel === 'general_waste' || classification.channel === null)) {
    classification = {
      ...classification,
      status: 'recyclable',
      channel: 'blue_bin',
      reason: t(locale, 'classify.cleanGlassReason'),
      preparation: [t(locale, 'classify.cleanGlassPreparation')],
      tip: undefined,
    };
  }

  const mark = effectiveDepositMark(evidence, mode);
  const modelChoseOrdinaryWaste = classification.channel === 'blue_bin'
    || classification.channel === 'general_waste';
  const partialBeverageImage = mode === 'image'
    && isSingleBeverageCandidate(evidence)
    && !evidence.whole_container_visible;
  const unknownEligibilityBottleOrCan = isSingleBeverageCandidate(evidence)
    && isEligibleContainerForm(evidence)
    && isPlasticOrMetal(evidence)
    && mark === 'unverified';
  // A close crop that does not establish either package geometry or material
  // cannot support a confident disposal channel. Keep it unclassified even when
  // the model guesses a pouch or another ordinary-waste item from label artwork.
  const incompletePackageEvidence = mode === 'image'
    && !evidence.whole_container_visible
    && mark === 'unverified'
    && (evidence.form === 'unknown' || evidence.material === 'unknown');
  if (modelChoseOrdinaryWaste
    && (partialBeverageImage || unknownEligibilityBottleOrCan || incompletePackageEvidence)) {
    classification = toUnconfirmed(classification);
  }

  const nextAction = buildNextAction(classification, evidence, locale, mode);
  if (!nextAction) return classification;

  if (classification.status === 'not_sure') {
    classification = {
      ...classification,
      reason: nextAction.qualification,
      preparation: [nextAction.instruction],
      tip: undefined,
    };
  }
  return { ...classification, next_action: nextAction };
}

export function buildNextAction(
  result: ClassifyResult,
  evidence: BeverageEvidence,
  locale: Locale,
  mode: BeverageInputMode = 'text',
): NextAction | undefined {
  const mark = effectiveDepositMark(evidence, mode);
  const confirmed = result.channel === 'return_point'
    && result.status === 'recyclable'
    && hasConfirmedReturnEvidence(evidence, mode);
  const canTry = result.channel === null && result.status === 'not_sure'
    && isSingleBeverageCandidate(evidence)
    && isEligibleContainerForm(evidence)
    && isPlasticOrMetal(evidence)
    && volumeCanQualify(evidence)
    && (mark === 'unverified' || mark === 'singapore')
    && !evidence.damaged
    && !evidence.contaminated;
  const needsTypeCheck = result.channel === null && result.status === 'not_sure'
    && mode === 'image'
    && isSingleBeverageCandidate(evidence)
    && !evidence.whole_container_visible
    && volumeCanQualify(evidence)
    && mark !== 'absent'
    && mark !== 'foreign'
    && !evidence.damaged
    && !evidence.contaminated;
  if (!confirmed && !canTry && !needsTypeCheck) return undefined;
  const kind = confirmed ? 'return' : canTry ? 'try' : 'check';
  return {
    type: confirmed ? 'return_container' : canTry ? 'try_return_point' : 'check_container_type',
    channel: 'return_point',
    title: t(locale, `action.${kind}.title`),
    instruction: t(locale, `action.${kind}.instruction`),
    qualification: t(locale, `action.${kind}.qualification`),
  };
}

/** Used by both clients for navigation; never overwrites the classification. */
export function getDestinationChannel(result: ClassifyResult) {
  return result.next_action?.channel ?? result.channel;
}

/** Share the same action and qualification shown on the result screen. */
export function getResultShareText(result: ClassifyResult, locale: Locale): string {
  const action = result.next_action;
  const lines = action
    ? [result.item, action.title, action.instruction, action.qualification]
    : [
        `${t(locale, `status.${result.status}`)}: ${result.item}`,
        result.reason,
        result.channel ? t(locale, `instruction.${result.channel}`) : null,
        ...(result.preparation ?? []).map((step, index) => `${index + 1}. ${step}`),
        result.tip ? `${t(locale, 'result.tip')}${result.tip}` : null,
      ];
  return [...lines.filter(Boolean), 'https://binwhere.sg'].join('\n\n');
}

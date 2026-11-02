import { z } from 'zod';
import { t, type Locale, type TranslationKey } from './i18n';
import { ClassifyResultSchema, type ClassifyResult, type NextAction } from './types/classify';

/** Facts reported by the classifier; mark presence never proves refund acceptance. */
export const BeverageEvidenceSchema = z.object({
  beverage_product: z.enum(['prepackaged_beverage', 'other', 'unknown']),
  visible_container_count: z.enum(['one', 'multiple', 'unknown']),
  subject: z.enum(['single_prepackaged_beverage_container', 'outer_packaging', 'no_container', 'other', 'unknown']),
  form: z.enum(['bottle', 'can', 'carton', 'pouch', 'cup', 'other', 'unknown']),
  material: z.enum(['plastic', 'metal', 'glass', 'paper', 'composite', 'other', 'unknown']),
  volume_range: z.enum(['below_150ml', '150ml_to_3l', 'above_3l', 'unknown']),
  /** True only for observed crushing or barcode damage; an unseen barcode is not damage. */
  damaged: z.boolean(),
  /** Normal drink contents that can be emptied do not count as contamination. */
  contaminated: z.boolean(),
  /** Readable 10¢ SG RETURN printed on the single drink container itself. */
  singapore_mark: z.enum(['readable', 'unknown']),
  /** Text-only explicit statements, never inferred from a photograph or foreign logo. */
  explicitly_no_singapore_mark: z.boolean(),
  purchased_outside_singapore: z.boolean(),
});

export type BeverageEvidence = z.infer<typeof BeverageEvidenceSchema>;
export const BEVERAGE_EVIDENCE_JSON_SCHEMA = z.toJSONSchema(BeverageEvidenceSchema, { target: 'draft-7' });
export type BeverageInputMode = 'text' | 'image';

const eligibleForm = (e: BeverageEvidence) => ['bottle', 'can', 'cup'].includes(e.form);
const eligibleMaterial = (e: BeverageEvidence) => e.material === 'plastic' || e.material === 'metal';
const singleDrink = (e: BeverageEvidence) => e.beverage_product === 'prepackaged_beverage'
  && e.visible_container_count === 'one' && e.subject === 'single_prepackaged_beverage_container';
const possibleCategory = (e: BeverageEvidence) => (eligibleForm(e) || e.form === 'unknown')
  && (eligibleMaterial(e) || e.material === 'unknown');
const textExclusion = (e: BeverageEvidence, mode: BeverageInputMode) => mode === 'text'
  && (e.explicitly_no_singapore_mark || e.purchased_outside_singapore);
const volumeExcluded = (e: BeverageEvidence) => e.volume_range === 'below_150ml' || e.volume_range === 'above_3l';
const categoryGeometry = (e: BeverageEvidence) => (eligibleForm(e) && eligibleMaterial(e))
  || (possibleCategory(e) && e.singapore_mark === 'readable');

// Shape and material identify the category. Capacity, like damage and contamination, can only
// exclude: containers outside 150ml-3L never carry the Deposit Mark the user is told to check.
function categoryEstablished(e: BeverageEvidence, mode: BeverageInputMode) {
  return singleDrink(e) && categoryGeometry(e) && !e.damaged && !e.contaminated
    && !volumeExcluded(e) && !textExclusion(e, mode);
}

/** Uncertainty has no disposal channel; all visible copy is owned by the application. */
export function toUnconfirmed(result: ClassifyResult, locale: Locale): ClassifyResult {
  const classification = { ...result };
  delete classification.next_action;
  return {
    ...classification, status: 'not_sure', channel: null,
    confidence: Math.min(result.confidence, 0.49),
    reason: t(locale, 'classify.notSureReason'),
    preparation: [t(locale, 'classify.notSurePreparation')], tip: undefined,
  };
}

function chooseChannel(
  result: ClassifyResult, channel: 'return_point' | 'blue_bin' | 'general_waste',
  locale: Locale, reason: TranslationKey, preparation: TranslationKey,
): ClassifyResult {
  const status = channel === 'general_waste' ? 'not_recyclable' : 'recyclable';
  if (channel === 'return_point') {
    return {
      ...result, channel, status, confidence: Math.max(0.5, result.confidence),
      reason: t(locale, 'bcrs.classifyReason'),
      preparation: ['bcrs.step1', 'bcrs.step2', 'bcrs.step3', 'bcrs.step4']
        .map((key) => t(locale, key as TranslationKey)),
      tip: t(locale, 'bcrs.refundAmount'),
    };
  }
  if (result.channel === channel && result.status === status) return result;
  return {
    ...result, channel, status, confidence: Math.max(0.5, result.confidence),
    reason: t(locale, reason), preparation: [t(locale, preparation)], tip: undefined,
  };
}

/** Ordered category policy shared by text and image classification. */
export function applyBeverageActionPolicy(
  result: ClassifyResult, evidence: BeverageEvidence, locale: Locale, mode: BeverageInputMode,
): ClassifyResult {
  const base = { ...result };
  delete base.next_action;
  let classification: ClassifyResult;
  // Ambiguous scenes and outer packaging cannot describe one container.
  if (evidence.visible_container_count === 'multiple'
    || evidence.subject === 'outer_packaging' || evidence.subject === 'no_container') {
    classification = toUnconfirmed(base, locale);
  } else if (evidence.beverage_product === 'other' || evidence.subject === 'other') {
    // Identified excluded products follow their ordinary channel (rule 5).
    classification = base.channel === 'return_point' ? toUnconfirmed(base, locale) : base;
  } else if (evidence.beverage_product === 'unknown' || evidence.visible_container_count === 'unknown'
    || evidence.subject === 'unknown') {
    classification = possibleCategory(evidence) || base.channel === 'return_point'
      ? toUnconfirmed(base, locale) : base;
  } else if (possibleCategory(evidence)) {
    if (!categoryGeometry(evidence)) {
      classification = toUnconfirmed(base, locale);
    } else if (evidence.contaminated) {
      classification = chooseChannel(base, 'general_waste', locale,
        'classify.contaminatedBeverageReason', 'classify.contaminatedBeveragePreparation');
    } else if (evidence.damaged || volumeExcluded(evidence) || textExclusion(evidence, mode)) {
      classification = chooseChannel(base, 'blue_bin', locale,
        'classify.excludedBeverageReason', 'classify.excludedBeveragePreparation');
    } else {
      classification = chooseChannel(base, 'return_point', locale, 'bcrs.classifyReason', 'bcrs.step1');
    }
  } else if (evidence.form === 'bottle' && evidence.material === 'glass'
    && !evidence.damaged && !evidence.contaminated
    && (base.channel === 'general_waste' || base.channel === null || base.channel === 'return_point')) {
    classification = chooseChannel(base, 'blue_bin', locale,
      'classify.cleanGlassReason', 'classify.cleanGlassPreparation');
  } else {
    classification = base.channel === 'return_point' ? toUnconfirmed(base, locale) : base;
  }
  const action = buildNextAction(classification, evidence, locale, mode);
  if (action) classification.next_action = action;
  return ClassifyResultSchema.parse(classification);
}

export function buildNextAction(
  result: ClassifyResult, evidence: BeverageEvidence, locale: Locale, mode: BeverageInputMode = 'text',
): NextAction | undefined {
  const confirmed = result.channel === 'return_point' && result.status === 'recyclable'
    && categoryEstablished(evidence, mode);
  const needsTypeCheck = result.channel === null && result.status === 'not_sure'
    && singleDrink(evidence) && possibleCategory(evidence) && !categoryGeometry(evidence);
  if (!confirmed && !needsTypeCheck) return undefined;
  const kind = confirmed ? 'return' : 'check';
  return {
    type: confirmed ? 'return_container' : 'check_container_type', channel: 'return_point',
    title: t(locale, `action.${kind}.title`), instruction: t(locale, `action.${kind}.instruction`),
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

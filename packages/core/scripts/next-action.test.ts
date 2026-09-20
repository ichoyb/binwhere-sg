import assert from 'node:assert/strict';
import {
  applyBeverageActionPolicy,
  buildNextAction,
  ClassifyResultSchema,
  getDestinationChannel,
  getResultShareText,
  hasExplicitForeignDepositText,
  ScanHistorySchema,
  t,
  VALID_LOCALES,
  type BeverageEvidence,
  type ClassifyResult,
} from '../src';

const unknownBottle: ClassifyResult = {
  item: 'empty plastic water bottle', status: 'not_sure', channel: null,
  confidence: 0.3, reason: 'Eligibility not established', preparation: ['Legacy photo request'],
};
const bottle: BeverageEvidence = {
  beverage_product: 'prepackaged_beverage',
  visible_container_count: 'one',
  subject: 'single_prepackaged_beverage_container',
  whole_container_visible: true,
  form: 'bottle',
  material: 'plastic',
  volume_ml: null,
  deposit_mark: 'unverified',
  deposit_mark_text: '',
  mark_on_subject_container: false,
  linear_barcode_on_subject: false,
  damaged: false,
  contaminated: false,
};

for (const locale of VALID_LOCALES) {
  const result = applyBeverageActionPolicy(unknownBottle, bottle, locale, 'text');
  assert.equal(result.next_action?.type, 'try_return_point');
  assert.equal(result.next_action?.qualification, t(locale, 'action.try.qualification'));
  assert.ok(result.next_action?.instruction.includes('S$0.10'));
  assert.deepEqual(result.preparation, [result.next_action?.instruction]);
  assert.equal(result.reason, result.next_action?.qualification);
  assert.equal(ClassifyResultSchema.safeParse(result).success, true);
  assert.equal(getDestinationChannel(result), 'return_point');
  const shared = getResultShareText(result, locale);
  assert.ok(shared.includes(result.next_action?.instruction ?? 'missing instruction'));
  assert.ok(shared.includes(result.next_action?.qualification ?? 'missing qualification'));
  assert.ok(!shared.includes('Legacy photo request'));
  assert.deepEqual(JSON.parse(JSON.stringify(result)).next_action, result.next_action);
}

// No confidence threshold or item-name string matching controls the action.
assert.equal(buildNextAction({ ...unknownBottle, item: 'தண்ணீர் பாட்டில்', confidence: 0.01 }, bottle, 'ta')?.type, 'try_return_point');
for (const excluded of [
  { visible_container_count: 'multiple' },
  { form: 'carton' }, { form: 'pouch' },
  { material: 'glass' }, { material: 'unknown' }, { volume_ml: 149 }, { volume_ml: 3001 },
  { deposit_mark: 'absent' }, { damaged: true }, { contaminated: true },
] as Partial<BeverageEvidence>[]) {
  assert.equal(buildNextAction(unknownBottle, { ...bottle, ...excluded }, 'en'), undefined, JSON.stringify(excluded));
}
for (const volume_ml of [150, 3000]) {
  assert.equal(buildNextAction(unknownBottle, { ...bottle, volume_ml }, 'en')?.type, 'try_return_point');
}
assert.equal(buildNextAction(unknownBottle, { ...bottle, form: 'cup' }, 'en')?.type, 'try_return_point');

// A bare probabilistic "foreign" label cannot veto an action. Literal scheme text can.
const guessedForeign = { ...bottle, deposit_mark: 'foreign' as const, deposit_mark_text: '10?' };
assert.equal(hasExplicitForeignDepositText(guessedForeign), false);
assert.equal(buildNextAction(unknownBottle, guessedForeign, 'en')?.type, 'try_return_point');
const explicitForeign = {
  ...guessedForeign,
  deposit_mark_text: 'Refund at collection depots in participating territory of purchase',
};
assert.equal(hasExplicitForeignDepositText(explicitForeign), true);
assert.equal(buildNextAction(unknownBottle, explicitForeign, 'en'), undefined);
const californiaCrv = { ...guessedForeign, deposit_mark_text: 'CA CRV' };
assert.equal(hasExplicitForeignDepositText(californiaCrv), true);
assert.equal(buildNextAction(unknownBottle, californiaCrv, 'en'), undefined);

// A cropped drink label gets a conditional action and cannot be routed to rubbish
// based on an invented pouch/carton shape.
const partialLabel: BeverageEvidence = {
  ...bottle,
  whole_container_visible: false,
  form: 'unknown',
  material: 'unknown',
};
const guessedWaste: ClassifyResult = {
  ...unknownBottle,
  status: 'not_recyclable',
  channel: 'general_waste',
  confidence: 0.82,
};
const partialResult = applyBeverageActionPolicy(guessedWaste, partialLabel, 'en', 'image');
assert.equal(partialResult.status, 'not_sure');
assert.equal(partialResult.channel, null);
assert.equal(partialResult.confidence, 0.49);
assert.equal(partialResult.next_action?.type, 'check_container_type');
assert.equal(partialResult.reason, t('en', 'action.check.qualification'));

// A label close-up with unknown package geometry/material cannot be confidently
// sent to ordinary waste merely because the model guessed the product identity.
// It remains not_sure, but does not gain a Return Point action without evidence
// that the subject is one prepackaged beverage container.
const unsupportedPouchGuess = applyBeverageActionPolicy(guessedWaste, {
  ...partialLabel,
  beverage_product: 'other',
  visible_container_count: 'one',
  subject: 'other',
}, 'en', 'image');
assert.equal(unsupportedPouchGuess.status, 'not_sure');
assert.equal(unsupportedPouchGuess.channel, null);
assert.equal(unsupportedPouchGuess.next_action, undefined);

// A cropped image cannot recover Return Point eligibility when a visible capacity
// already proves the container is outside the 150 ml–3 L scheme boundary.
for (const locale of VALID_LOCALES) {
  for (const volume_ml of [100, 5000]) {
    const outsideScheme = applyBeverageActionPolicy(
      guessedWaste,
      { ...partialLabel, volume_ml },
      locale,
      'image',
    );
    assert.equal(outsideScheme.next_action, undefined, `${locale}: ${volume_ml} ml`);
    assert.equal(getDestinationChannel(outsideScheme), null, `${locale}: ${volume_ml} ml`);
  }
}
for (const volume_ml of [150, 3000]) {
  assert.equal(
    buildNextAction(unknownBottle, { ...partialLabel, volume_ml }, 'en', 'image')?.type,
    'check_container_type',
  );
}

// An outer wrapping layer is not the individual container the user could return,
// even when one enclosed product is distinguishable in the image.
const baggedLabel = { ...partialLabel, subject: 'other' as const, form: 'pouch' as const };
assert.equal(
  applyBeverageActionPolicy(unknownBottle, baggedLabel, 'en', 'image').next_action,
  undefined,
);
assert.equal(buildNextAction(
  unknownBottle,
  { ...baggedLabel, beverage_product: 'other' },
  'en',
  'image',
), undefined);
assert.equal(buildNextAction(
  unknownBottle,
  { ...baggedLabel, visible_container_count: 'multiple' },
  'en',
  'image',
), undefined);
assert.equal(
  buildNextAction(
    unknownBottle,
    { ...baggedLabel, beverage_product: 'unclear', visible_container_count: 'unclear', subject: 'single_prepackaged_beverage_container' },
    'en',
    'image',
  )?.type,
  'check_container_type',
);
assert.equal(
  buildNextAction(
    unknownBottle,
    { ...baggedLabel, subject: 'unclear' },
    'en',
    'image',
  )?.type,
  'check_container_type',
);

// A barcode on one visible can or bottle does not turn a multipack into a single
// container. Contradictory count/subject evidence therefore cannot produce a
// Return Point action, regardless of material, volume or barcode visibility.
const multipackWithVisibleBarcode: BeverageEvidence = {
  ...partialLabel,
  visible_container_count: 'multiple',
  subject: 'other',
  form: 'can',
  material: 'metal',
  volume_ml: 330,
  linear_barcode_on_subject: true,
};
for (const locale of VALID_LOCALES) {
  assert.equal(
    buildNextAction(unknownBottle, multipackWithVisibleBarcode, locale, 'image'),
    undefined,
  );
  assert.equal(
    buildNextAction(
      unknownBottle,
      { ...multipackWithVisibleBarcode, visible_container_count: 'one' },
      locale,
      'image',
    ),
    undefined,
  );
}
assert.equal(buildNextAction(
  unknownBottle,
  { ...multipackWithVisibleBarcode, form: 'bottle', material: 'plastic' },
  'en',
  'image',
), undefined);

// A partial image that still establishes an eligible container form, material and
// one physical container can give a conditional action even when subject wording
// is uncertain. A visible barcode is not required for this qualified trial action.
const uncertainCan = {
  ...bottle,
  subject: 'unclear' as const,
  whole_container_visible: false,
  form: 'can' as const,
  material: 'metal' as const,
  linear_barcode_on_subject: true,
};
const uncertainCanResult = applyBeverageActionPolicy(
  unknownBottle,
  uncertainCan,
  'en',
  'image',
);
assert.equal(uncertainCanResult.channel, null);
assert.equal(uncertainCanResult.next_action?.type, 'try_return_point');
assert.equal(buildNextAction(
  unknownBottle,
  { ...uncertainCan, linear_barcode_on_subject: false },
  'en',
  'image',
)?.type, 'try_return_point');

// A complete excluded package keeps its ordinary disposal classification.
const pouch: BeverageEvidence = {
  ...bottle,
  whole_container_visible: true,
  form: 'pouch',
  material: 'composite',
};
const pouchResult = applyBeverageActionPolicy(guessedWaste, pouch, 'en', 'image');
assert.equal(pouchResult.channel, 'general_waste');
assert.equal(pouchResult.next_action, undefined);
assert.equal(buildNextAction(unknownBottle, { ...pouch, material: 'unknown' }, 'en', 'image'), undefined);

const cleanGlass = applyBeverageActionPolicy(guessedWaste, {
  ...pouch,
  form: 'bottle',
  material: 'glass',
}, 'en', 'image');
assert.equal(cleanGlass.channel, 'blue_bin');
assert.equal(cleanGlass.status, 'recyclable');
assert.equal(cleanGlass.reason, t('en', 'classify.cleanGlassReason'));
assert.equal(cleanGlass.next_action, undefined);
const dirtyGlass = applyBeverageActionPolicy(guessedWaste, {
  ...pouch,
  form: 'bottle',
  material: 'glass',
  contaminated: true,
}, 'en', 'image');
assert.equal(dirtyGlass.channel, 'general_waste');

// Confirmed refunds require all application-checked facts. An unreadable mark is
// downgraded, while readable SG RETURN plus the same-container barcode is retained.
const modelReturn: ClassifyResult = {
  ...unknownBottle, status: 'recyclable', channel: 'return_point', confidence: 0.95,
};
const unsafeReturn = applyBeverageActionPolicy(modelReturn, {
  ...bottle,
  deposit_mark: 'singapore',
  deposit_mark_text: '10?',
  mark_on_subject_container: true,
  linear_barcode_on_subject: true,
}, 'en', 'image');
assert.equal(unsafeReturn.channel, null);
assert.equal(unsafeReturn.next_action?.type, 'try_return_point');

const confirmedEvidence: BeverageEvidence = {
  ...bottle,
  deposit_mark: 'singapore',
  deposit_mark_text: '10¢ SG RETURN',
  mark_on_subject_container: true,
  linear_barcode_on_subject: true,
};
const confirmed = applyBeverageActionPolicy(modelReturn, confirmedEvidence, 'en', 'image');
assert.equal(confirmed.next_action?.type, 'return_container');
const promoted = applyBeverageActionPolicy(unknownBottle, confirmedEvidence, 'en', 'image');
assert.equal(promoted.channel, 'return_point');
assert.equal(promoted.status, 'recyclable');
assert.equal(promoted.next_action?.type, 'return_container');
assert.equal(ClassifyResultSchema.safeParse(confirmed).success, true);
assert.equal(ClassifyResultSchema.safeParse({ ...unknownBottle, next_action: confirmed.next_action }).success, false);
assert.equal(ClassifyResultSchema.safeParse({ ...modelReturn, next_action: buildNextAction(unknownBottle, bottle, 'en') }).success, false);
assert.equal(buildNextAction({ ...unknownBottle, status: 'recyclable', channel: 'blue_bin' }, bottle, 'en'), undefined);
assert.equal(ClassifyResultSchema.safeParse(unknownBottle).success, true);
assert.equal(getDestinationChannel(unknownBottle), null);

const stored = ScanHistorySchema.parse([{
  id: 'action-history', item: unknownBottle.item, status: unknownBottle.status,
  timestamp: Date.now(), channel: null,
  result: applyBeverageActionPolicy(unknownBottle, bottle, 'en', 'text'),
}]);
assert.equal(stored[0].result?.next_action?.type, 'try_return_point');
console.log('PASS next actions: four locales, deterministic evidence policy, contract, navigation, sharing and history');

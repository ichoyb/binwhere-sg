import assert from 'node:assert/strict';
import {
  applyBeverageActionPolicy, BeverageEvidenceSchema, buildNextAction, ClassifyResultSchema,
  getDestinationChannel, getResultShareText, ScanHistorySchema, t, VALID_LOCALES,
  type BeverageEvidence, type ClassifyResult,
} from '../src';

const bottle: BeverageEvidence = {
  beverage_product: 'prepackaged_beverage', visible_container_count: 'one',
  subject: 'single_prepackaged_beverage_container', form: 'bottle', material: 'plastic',
  volume_range: '150ml_to_3l', singapore_mark: 'unknown', damaged: false, contaminated: false,
  explicitly_no_singapore_mark: false, purchased_outside_singapore: false,
};
const unknown: ClassifyResult = {
  item: 'drink container', channel: null, status: 'not_sure', confidence: 0.1,
  reason: 'MODEL REASON', preparation: ['MODEL STEP'], tip: 'MODEL TIP',
};
const modelReturn: ClassifyResult = { ...unknown, channel: 'return_point', status: 'recyclable', confidence: 0.96 };
const modelBlue: ClassifyResult = { ...modelReturn, channel: 'blue_bin' };
const modelWaste: ClassifyResult = { ...modelReturn, channel: 'general_waste', status: 'not_recyclable' };
let assertions = 0;

for (const locale of VALID_LOCALES) {
  for (const mode of ['text', 'image'] as const) {
    const decide = (patch: Partial<BeverageEvidence>, model = modelReturn) => {
      const result = applyBeverageActionPolicy(model, { ...bottle, ...patch }, locale, mode);
      assert.equal(ClassifyResultSchema.safeParse(result).success, true);
      assert.notEqual(result.next_action?.type, 'try_return_point');
      if (result.channel === null) {
        assert.equal(result.status, 'not_sure');
        assert.ok(result.confidence <= 0.49);
        const prose = getResultShareText(result, locale);
        assert.doesNotMatch(prose, /blue[ _-]?(?:recycling[ _-]?)?bin|蓝色回收|tong (?:kitar semula )?biru|நீல/iu);
      }
      assertions += 1;
      return result;
    };
    // Rule 1 precedes dirt, damage and even a readable mark.
    for (const patch of [
      { visible_container_count: 'multiple' }, { visible_container_count: 'unknown' },
      { subject: 'outer_packaging' }, { subject: 'no_container' }, { subject: 'other' },
      { subject: 'unknown' }, { beverage_product: 'unknown' },
    ] as Partial<BeverageEvidence>[]) {
      const result = decide({ ...patch, singapore_mark: 'readable', contaminated: true, damaged: true });
      assert.equal(result.channel, null, JSON.stringify(patch));
      assert.equal(result.next_action, undefined);
      assert.equal(result.reason, t(locale, 'classify.notSureReason'));
      assert.equal(result.tip, undefined);
    }
    // Excluded products precede unknown identity; ambiguous scenes precede both.
    for (const excluded of [{ beverage_product: 'other' }, { subject: 'other' }] as Partial<BeverageEvidence>[]) {
      for (const model of [modelBlue, modelWaste, { ...modelReturn, channel: 'ewaste', status: 'special_handling' } as ClassifyResult]) {
        const patch = { beverage_product: 'unknown', subject: 'unknown', visible_container_count: 'unknown',
          ...excluded, singapore_mark: 'readable', contaminated: true, damaged: true } as Partial<BeverageEvidence>;
        assert.deepEqual(decide(patch, model), model);
        assert.equal(decide(patch).channel, null);
        for (const scene of [{ visible_container_count: 'multiple' }, { subject: 'outer_packaging' },
          { subject: 'no_container' }] as Partial<BeverageEvidence>[]) {
          const result = decide({ ...patch, ...scene }, model);
          assert.equal(result.channel, null);
          assert.equal(result.next_action, undefined);
        }
      }
    }
    // Each unknown identity field blocks only a potentially in-scope geometry.
    for (const key of ['beverage_product', 'visible_container_count', 'subject'] as const) {
      for (const form of ['bottle', 'can', 'cup', 'unknown'] as const) {
        for (const material of ['plastic', 'metal', 'unknown'] as const) {
          const result = decide({ [key]: 'unknown', form, material, singapore_mark: 'readable' }, modelBlue);
          assert.equal(result.channel, null);
          assert.equal(result.next_action, undefined);
          assert.equal(result.reason, t(locale, 'classify.notSureReason'));
        }
      }
      for (const geometry of [{ form: 'carton' }, { form: 'pouch' }, { form: 'other' },
        { material: 'glass' }, { material: 'paper' }, { material: 'composite' },
        { material: 'other' }] as Partial<BeverageEvidence>[]) {
        const patch = { [key]: 'unknown', ...geometry };
        for (const model of [modelBlue, modelWaste]) assert.deepEqual(decide(patch, model), model);
        const unsupportedReturn = decide(patch);
        assert.equal(unsupportedReturn.channel, null);
        assert.equal(unsupportedReturn.next_action, undefined);
      }
    }
    // Rule 2.1 wins over every reason for ordinary recycling.
    for (const patch of [{}, { damaged: true }, { volume_range: 'below_150ml' },
      { volume_range: 'above_3l' }, { explicitly_no_singapore_mark: true },
      { purchased_outside_singapore: true }] as Partial<BeverageEvidence>[]) {
      const result = decide({ ...patch, contaminated: true, singapore_mark: 'readable' });
      assert.equal(result.channel, 'general_waste');
      assert.equal(result.status, 'not_recyclable');
      assert.equal(result.next_action, undefined);
      assert.equal(result.reason, t(locale, 'classify.contaminatedBeverageReason'));
      assert.equal(result.tip, undefined);
    }
    // Rule 2.2 wins over a readable mark, including for otherwise unknown facts.
    for (const patch of [{ damaged: true }, { volume_range: 'below_150ml' },
      { volume_range: 'above_3l' }] as Partial<BeverageEvidence>[]) {
      for (const form of ['bottle', 'unknown'] as const) {
        const result = decide({ ...patch, form, singapore_mark: 'readable' });
        assert.equal(result.channel, 'blue_bin');
        assert.equal(result.reason, t(locale, 'classify.excludedBeverageReason'));
        assert.deepEqual(result.preparation, [t(locale, 'classify.excludedBeveragePreparation')]);
        assert.equal(result.tip, undefined);
        assert.equal(result.next_action, undefined);
      }
    }
    for (const patch of [{ explicitly_no_singapore_mark: true }, { purchased_outside_singapore: true }]) {
      assert.equal(decide({ ...patch, singapore_mark: 'readable' }).channel,
        mode === 'text' ? 'blue_bin' : 'return_point');
    }
    // Rule 2.3: all supported form/material combinations work without mark/barcode evidence.
    for (const form of ['bottle', 'can', 'cup'] as const) {
      for (const material of ['plastic', 'metal'] as const) {
        const promoted = decide({ form, material }, unknown);
        assert.equal(promoted.channel, 'return_point');
        assert.equal(promoted.status, 'recyclable');
        assert.equal(promoted.confidence, 0.5);
        assert.equal(promoted.next_action?.type, 'return_container');
        assert.equal(promoted.reason, t(locale, 'bcrs.classifyReason'));
        assert.equal(promoted.tip, t(locale, 'bcrs.refundAmount'));
        assert.deepEqual(promoted.preparation, ['bcrs.step1', 'bcrs.step2', 'bcrs.step3', 'bcrs.step4']
          .map((key) => t(locale, key as Parameters<typeof t>[1])));
        assert.equal(getDestinationChannel(promoted), 'return_point');
        assert.ok(getResultShareText(promoted, locale).includes(t(locale, 'action.return.qualification')));
      }
    }
    // Capacity only excludes: an unknown capacity withholds neither the channel nor the action.
    const unstatedCapacity = decide({ volume_range: 'unknown' }, unknown);
    assert.equal(unstatedCapacity.channel, 'return_point');
    assert.equal(unstatedCapacity.next_action?.type, 'return_container');
    // Rule 3: each missing shape or material fact matters; a readable subject mark fills only unknowns.
    for (const patch of [{ form: 'unknown' }, { material: 'unknown' },
      { form: 'unknown', material: 'unknown', volume_range: 'unknown' }] as Partial<BeverageEvidence>[]) {
      const checked = decide(patch, modelWaste);
      assert.equal(checked.channel, null);
      assert.equal(checked.confidence, 0.49);
      assert.equal(checked.next_action?.type, 'check_container_type');
      assert.equal(checked.next_action.title, t(locale, 'action.check.title'));
      assert.equal(checked.next_action.instruction, t(locale, 'action.check.instruction'));
      assert.equal(checked.next_action.qualification, t(locale, 'action.check.qualification'));
      assert.equal(decide({ ...patch, singapore_mark: 'readable' }, unknown).channel, 'return_point');
    }
    // Unknown geometry does not prove a plastic/metal container, even with an observed exclusion.
    for (const patch of [{ damaged: true }, { contaminated: true }, { volume_range: 'below_150ml' }] as Partial<BeverageEvidence>[]) {
      const unresolved = decide({ ...patch, material: 'unknown' });
      assert.equal(unresolved.channel, null);
      assert.equal(unresolved.next_action?.type, 'check_container_type');
      const established = decide({ ...patch, material: 'unknown', singapore_mark: 'readable' });
      assert.equal(established.channel, patch.contaminated ? 'general_waste' : 'blue_bin');
    }
    // Rule 4 and detail a: known glass remains glass even when category facts are missing.
    const glass = decide({ material: 'glass', volume_range: 'unknown', singapore_mark: 'readable' }, modelWaste);
    assert.equal(glass.channel, 'blue_bin');
    assert.equal(glass.reason, t(locale, 'classify.cleanGlassReason'));
    assert.deepEqual(glass.preparation, [t(locale, 'classify.cleanGlassPreparation')]);
    assert.equal(glass.next_action, undefined);
    assert.equal(decide({ material: 'glass', contaminated: true }, modelWaste).channel, 'general_waste');
    // Clean glass restores only the three v21 source channels; ordinary channels retain prose.
    for (const model of [modelWaste, unknown, modelReturn]) {
      const clean = decide({ material: 'glass' }, model);
      assert.equal(clean.channel, 'blue_bin');
      assert.equal(clean.reason, t(locale, 'classify.cleanGlassReason'));
      assert.deepEqual(clean.preparation, [t(locale, 'classify.cleanGlassPreparation')]);
      assert.equal(clean.tip, undefined);
    }
    const special: ClassifyResult = { ...modelReturn, channel: 'hazardous', status: 'special_handling' };
    for (const model of [modelBlue, special]) assert.deepEqual(decide({ material: 'glass' }, model), model);
    for (const form of ['can', 'cup', 'carton', 'pouch', 'other', 'unknown'] as const) {
      assert.deepEqual(decide({ material: 'glass', form }, modelWaste), modelWaste);
      assert.equal(decide({ material: 'glass', form }).channel, null);
    }
    for (const condition of [{ damaged: true }, { contaminated: true }, { damaged: true, contaminated: true }]) {
      for (const model of [modelBlue, modelWaste, special, unknown]) {
        assert.deepEqual(decide({ material: 'glass', ...condition }, model), model);
      }
      const rejected = decide({ material: 'glass', ...condition });
      assert.equal(rejected.channel, null);
      assert.equal(rejected.next_action, undefined);
    }
    // Return Point prose always belongs to the application, even for an unchanged model channel.
    const sameReturn = decide({}, modelReturn);
    assert.equal(sameReturn.reason, t(locale, 'bcrs.classifyReason'));
    assert.deepEqual(sameReturn.preparation, ['bcrs.step1', 'bcrs.step2', 'bcrs.step3', 'bcrs.step4']
      .map((key) => t(locale, key as Parameters<typeof t>[1])));
    assert.equal(sameReturn.tip, t(locale, 'bcrs.refundAmount'));
    // Rules 5 and 6: a known incompatible form/material never gets upgraded by a mark.
    for (const patch of [{ form: 'carton' }, { form: 'pouch' }, { form: 'other' },
      { material: 'paper' }, { material: 'composite' }, { material: 'other' },
      { beverage_product: 'other', subject: 'other' }] as Partial<BeverageEvidence>[]) {
      const excluded = { ...patch, singapore_mark: 'readable' as const };
      assert.equal(decide(excluded).channel, null, JSON.stringify(patch));
      assert.equal(decide(excluded).next_action, undefined);
      const ordinary = decide(excluded, modelBlue);
      assert.equal(ordinary.channel, 'blue_bin');
      assert.equal(ordinary.reason, modelBlue.reason);
      assert.deepEqual(ordinary.preparation, modelBlue.preparation);
      assert.equal(ordinary.tip, modelBlue.tip);
    }
    // Detail d: unchanged channels retain model prose; rewritten channels replace all three fields.
    for (const [patch, model] of [
      [{ damaged: true }, modelBlue], [{ contaminated: true }, modelWaste],
      [{ material: 'glass' }, modelBlue],
    ] as Array<[Partial<BeverageEvidence>, ClassifyResult]>) {
      const same = decide(patch, model);
      assert.equal(same.reason, model.reason);
      assert.deepEqual(same.preparation, model.preparation);
      assert.equal(same.tip, model.tip);
    }
    // A model-provided legacy action cannot survive the policy.
    const legacy: ClassifyResult = { ...unknown, next_action: {
      type: 'try_return_point', channel: 'return_point', title: 'legacy', instruction: 'legacy', qualification: 'legacy',
    } };
    assert.equal(decide({}, legacy).next_action?.type, 'return_container');
    assert.equal(decide({ visible_container_count: 'multiple' }, legacy).next_action, undefined);
  }
  // Amounts appear only in fields that explicitly promise a refund.
  for (const kind of ['return', 'check'] as const) {
    for (const field of ['title', 'instruction', 'qualification'] as const) {
      const hasAmount = kind === 'return' ? field === 'title' : field === 'instruction';
      assert.equal(t(locale, `action.${kind}.${field}`).includes('S$0.10'), hasAmount);
    }
  }
  assert.doesNotMatch(t(locale, 'action.check.qualification'), /photo|照片|foto|படத்தில்/iu);
  assert.ok(t(locale, 'action.return.instruction').includes(locale === 'zh' ? '押金标志' : 'Deposit Mark'));
  assert.ok(t(locale, 'action.return.instruction').includes('10¢ SG RETURN'));
  assert.ok(t(locale, 'bcrs.classifyReason').includes('S$0.10'));
}

// Unknown observations have explicit finite values; deleted confirmation fields are absent.
for (const key of ['beverage_product', 'visible_container_count', 'subject', 'form', 'material', 'volume_range', 'singapore_mark'] as const) {
  assert.equal(BeverageEvidenceSchema.safeParse({ ...bottle, [key]: 'unknown' }).success, true);
  assert.equal(BeverageEvidenceSchema.safeParse({ ...bottle, [key]: 'invented' }).success, false);
}
assert.equal(BeverageEvidenceSchema.safeParse({ ...bottle, volume_range: undefined }).success, false);
assert.deepEqual(Object.keys(BeverageEvidenceSchema.shape).sort(), [
  'beverage_product', 'visible_container_count', 'subject', 'form', 'material', 'volume_range',
  'damaged', 'contaminated', 'singapore_mark', 'explicitly_no_singapore_mark', 'purchased_outside_singapore',
].sort());
const checked = applyBeverageActionPolicy(unknown, { ...bottle, material: 'unknown' }, 'en', 'text');
assert.equal(buildNextAction(modelBlue, bottle, 'en'), undefined);
assert.equal(ClassifyResultSchema.safeParse({ ...modelReturn, next_action: checked.next_action }).success, false);
assert.equal(ClassifyResultSchema.safeParse({ ...unknown, next_action: buildNextAction(modelReturn, bottle, 'en') }).success, false);
const stored = ScanHistorySchema.parse([{
  id: 'action-history', item: checked.item, status: checked.status, timestamp: Date.now(), channel: null, result: checked,
}]);
assert.deepEqual(stored[0].result?.next_action, checked.next_action);
assert.equal(getDestinationChannel(checked), 'return_point');
assert.equal(getDestinationChannel(unknown), null);
console.log(`PASS category policy (${assertions} ordered cases), copy, sharing, history and frozen v1 actions`);

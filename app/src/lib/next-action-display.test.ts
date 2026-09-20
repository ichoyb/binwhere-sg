import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildNextAction, type ClassifyResult } from '@binwhere/core';
import ResultPage from '../components/result/ResultPage';
import NearbyListPage from '../components/nearby/NearbyListPage';
import { generateShareCard } from './share-card';

async function main() {
  const result: ClassifyResult = {
    item: '塑料水瓶', status: 'not_sure', channel: null, confidence: 0.3,
    reason: '旧版资格说明', preparation: ['请重新拍摄标签'],
  };
  result.next_action = buildNextAction(result, {
    beverage_product: 'prepackaged_beverage',
    visible_container_count: 'one',
    subject: 'single_prepackaged_beverage_container', whole_container_visible: true,
    form: 'bottle', material: 'plastic', volume_ml: null,
    deposit_mark: 'unverified', deposit_mark_text: '', mark_on_subject_container: false,
    linear_barcode_on_subject: false, damaged: false, contaminated: false,
  }, 'zh');
  const markup = renderToStaticMarkup(createElement(ResultPage, {
    result, capturedImage: null, userLocation: null, locale: 'zh',
    onScanAgain() {}, onViewNearby() {}, onRequestLocation() {},
  }));
  assert.ok(markup.includes('先倒空，保留瓶身和标签'));
  assert.ok(markup.includes('退款资格尚未确认'));
  assert.ok(!markup.includes('请重新拍摄标签'));
  assert.ok(!markup.includes('我们不太确定'));
  assert.ok(!markup.includes('旧版资格说明'));
  const nearby = renderToStaticMarkup(createElement(NearbyListPage, {
    result, userLocation: null, locale: 'zh', onBack() {},
  }));
  assert.ok(nearby.includes('BCRS 退还点'));
  assert.ok(nearby.includes('退款资格尚未确认'));
  assert.ok(!nearby.includes('蓝色回收桶'));

  // Exercise the actual canvas renderer, recording the visible text it draws.
  const drawn: string[] = [];
  const context = new Proxy({
    measureText: (value: string) => ({ width: value.length * 16 }),
    fillText: (value: string) => { drawn.push(value); },
  }, { get(target, key) { return Reflect.get(target, key) ?? (() => {}); } });
  const canvas = {
    getContext: () => context,
    toBlob: (callback: (blob: Blob) => void) => callback(new Blob(['canvas'], { type: 'image/png' })),
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => canvas } });
  try {
    await generateShareCard(result, 'zh');
    const text = drawn.join('');
    assert.ok(text.includes('退款资格尚未确认'));
    assert.ok(text.includes('符合条件并被接收后可退 S$0.10'));
    assert.ok(!text.includes('请重新拍摄标签'));
    assert.ok(!text.includes('旧版资格说明'));
  } finally {
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  }
  console.log('PASS result, nearby and canvas share preserve trial-action instructions and qualification');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

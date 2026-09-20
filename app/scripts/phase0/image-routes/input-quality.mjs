// Prepare a separate input-only comparison using the frozen facts experiment verbatim.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../../..');
const output = path.join(app, 'scripts/phase0/results/image-routes-20260920');
const sha = (x) => createHash('sha256').update(x).digest('hex');
const base = JSON.parse(fs.readFileSync(path.join(here, 'facts-plan.json'), 'utf8'));
const runtime = createRequire(import.meta.url)(path.join(output, 'runtime.cjs'));
const original = fs.readFileSync(path.join(here, 'facts.mjs'), 'utf8');
if (sha(original) !== base.harnessSha256) throw new Error('Frozen facts harness changed.');
const generated = original
  .replace("const here = path.dirname(fileURLToPath(import.meta.url));", `const here = ${JSON.stringify(here)};`)
  .replaceAll("'facts-", "'quality-");
if (generated === original) throw new Error('Runner derivation failed.');
const runnerFile = path.join(output, 'quality-runner.mjs');
fs.writeFileSync(runnerFile, generated, { flag: 'wx' });
const selected = ['holdout-singapore-mark-closeup-en', 'holdout-single-angle-malaysia-can-v7-en',
  'holdout-single-can-mark-and-barcode-v15-en'];
const variants = [{ id: 'q90-1024', size: 1024, quality: 90 }, { id: 'q70-2048', size: 2048, quality: 70 }];
const cases = [];
for (const id of selected) {
  const test = base.cases.find((c) => c.id === id);
  const source = runtime.BCRS_IMAGE_SOURCES.find((s) => s.id === test.sourceId);
  const raw = fs.readFileSync(path.join(app, 'scripts/phase0/fixtures/cache', source.filename));
  if (sha(raw) !== source.sha256) throw new Error('Source hash mismatch.');
  const framed = source.crop ? await sharp(raw).extract(source.crop).toBuffer() : raw;
  for (const variant of variants) {
    const transform = (buffer) => sharp(buffer).rotate()
      .resize(variant.size, variant.size, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' }).jpeg({ quality: variant.quality }).toBuffer();
    const client = await transform(framed);
    const bytes = await transform(client);
    const metadata = await sharp(bytes).metadata();
    if (bytes.length > 5 * 1024 * 1024 || Math.max(metadata.width, metadata.height) > 4096
      || metadata.width * metadata.height > 8_000_000) throw new Error('Input exceeds existing safety limits.');
    const filename = `${source.id}-${variant.id}.jpg`;
    fs.writeFileSync(path.join(output, filename), bytes, { flag: 'wx' });
    cases.push({ ...test, id: `${test.id}:${variant.id}`, baseId: test.id, variant: variant.id,
      filename, submittedSha256: sha(bytes), submittedBytes: bytes.length,
      width: metadata.width, height: metadata.height, identicalToBaseline: sha(bytes) === test.submittedSha256 });
  }
}
const plan = { ...base, id: 'image-routes-20260920-input-quality', frozenAt: new Date().toISOString(), cases,
  logicalCalls: cases.length * base.models.length * base.repetitions,
  purpose: 'One input variable at a time: JPEG 70 to 90, or long edge 1024 to 2048; same frozen facts prompt and decision code.',
  baseline: 'facts-plan.json current 1024/Q70 trials; same exposed images, no new holdout',
  variants, runnerDerivation: 'facts.mjs unchanged except experiment output/plan prefix and absolute research directory',
  sourceHarnessSha256: base.harnessSha256, harnessSha256: sha(generated) };
fs.writeFileSync(path.join(here, 'quality-plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ id: plan.id, calls: plan.logicalCalls, cases: cases.map((c) => ({
  id: c.id, width: c.width, height: c.height, identicalToBaseline: c.identicalToBaseline })) }, null, 2));

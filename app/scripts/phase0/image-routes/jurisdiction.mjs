// Isolate one definition ambiguity found in the facts experiment; preserve its original results.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../../..');
const output = path.join(app, 'scripts/phase0/results/image-routes-20260920');
const sha = (x) => createHash('sha256').update(x).digest('hex');
const base = JSON.parse(fs.readFileSync(path.join(here, 'facts-plan.json'), 'utf8'));
const original = fs.readFileSync(path.join(here, 'facts.mjs'), 'utf8');
if (sha(original) !== base.harnessSha256) throw new Error('Frozen source changed.');
const ambiguous = 'Report a foreign deposit mark only if its text or symbol visibly identifies another deposit scheme.';
const clarified = 'The target jurisdiction is Singapore. foreign_deposit_mark is true only when visible deposit markings identify a scheme outside Singapore; SG RETURN identifies Singapore and is not foreign. Country-of-manufacture text does not identify the deposit scheme.';
if (!base.system.includes(ambiguous)) throw new Error('Expected original definition missing.');
const generated = original.replace("const here = path.dirname(fileURLToPath(import.meta.url));", `const here = ${JSON.stringify(here)};`)
  .replaceAll("'facts-", "'jurisdiction-");
fs.writeFileSync(path.join(output, 'jurisdiction-runner.mjs'), generated, { flag: 'wx' });
const cases = base.cases.filter((c) => ['official-mark-closeup-en', 'holdout-foreign-refund-mark-en',
  'holdout-single-bottle-mark-and-barcode-v16-en', 'holdout-singapore-mark-closeup-en'].includes(c.id));
const plan = { ...base, id: 'image-routes-20260920-jurisdiction', frozenAt: new Date().toISOString(),
  purpose: 'Diagnostic ablation: define foreign relative to Singapore; keep all other facts and rule code unchanged.',
  cases, logicalCalls: cases.length * base.models.length * base.repetitions,
  system: base.system.replace(ambiguous, clarified), definitionChange: { before: ambiguous, after: clarified },
  baseline: 'facts-plan.json same four cases, same inputs and two repetitions; diagnostic only',
  sourceHarnessSha256: base.harnessSha256, harnessSha256: sha(generated) };
fs.writeFileSync(path.join(here, 'jurisdiction-plan.json'), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ id: plan.id, calls: plan.logicalCalls, sha256: sha(JSON.stringify(plan)) }));

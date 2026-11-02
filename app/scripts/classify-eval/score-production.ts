import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { validateProductionRaw } from './production-validation';
import { writeProductionBaselines } from './production-scoring';
import type { ProductionRawOutput } from './production-types';

const rawPath = process.argv.find((arg) => arg.startsWith('--raw='))?.slice(6);
assert.ok(rawPath && isAbsolute(rawPath), 'Required: --raw=<absolute-output-path>');
const raw = JSON.parse(readFileSync(rawPath, 'utf8')) as ProductionRawOutput;
if (raw.source?.dryRun) {
  validateProductionRaw(raw, true);
  console.log('Dry-run format and provenance verified; no baseline files written.');
} else {
  for (const output of writeProductionBaselines(raw)) console.log(`Production baseline: ${output}`);
}

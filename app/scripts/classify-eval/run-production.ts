import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import * as dotenv from 'dotenv';

import { DEFAULT_EXECUTION_POLICY } from '../../src/lib/ai/provider';
import { exportProductionManifest } from './production-manifest';
import { verifyProductionWorktree } from './production-worktree';
import { productionPatchDigest, PRODUCTION_DEPENDENCIES, PRODUCTION_MODULE_PATHS, PRODUCTION_NODE_VERSION } from './production-contract';
import { validateProductionRaw } from './production-validation';
import { writeProductionBaselines } from './production-scoring';
import type { ProductionContext, ProductionRawOutput } from './production-types';

function arg(name: string) {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function main() {
  const requestedWorktree = arg('worktree');
  const output = arg('output');
  assert.ok(requestedWorktree && isAbsolute(requestedWorktree), 'Required: --worktree=<absolute-path>');
  assert.ok(output && isAbsolute(output), 'Required: --output=<absolute-raw-output-path>');
  assert.equal(process.version, PRODUCTION_NODE_VERSION, 'Use Node v24.22.1');
  const worktree = realpathSync(requestedWorktree);
  const preflight = verifyProductionWorktree(worktree);
  const dryRun = process.argv.includes('--dry-run');
  const directory = mkdtempSync(join(tmpdir(), 'binwhere-production-'));
  const manifestPath = join(directory, 'manifest.json');
  exportProductionManifest(manifestPath);
  const context: ProductionContext = {
    preflight, patchSha256: productionPatchDigest(), executionPolicy: DEFAULT_EXECUTION_POLICY,
  };
  const contextPath = join(directory, 'context.json');
  writeFileSync(contextPath, JSON.stringify({ ...context, expected: {
    modulePaths: PRODUCTION_MODULE_PATHS, dependencies: PRODUCTION_DEPENDENCIES, nodeVersion: PRODUCTION_NODE_VERSION,
  } }, null, 2));
  if (!dryRun) {
    dotenv.config({ path: join(__dirname, '../../.env'), quiet: true });
    assert.ok(process.env.TOKENHUB_API_KEY, 'TOKENHUB_API_KEY not set in app/.env');
  }
  const args = [join(__dirname, 'production-worker.ts'), `--worktree=${worktree}`,
    `--manifest=${manifestPath}`, `--context=${contextPath}`, `--output=${output}`,
    ...(dryRun ? ['--dry-run'] : [])];
  console.log(`Production ${dryRun ? 'dry run' : 'paid run'}; manifest: ${manifestPath}`);
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    const child = spawn(join(worktree, 'app/node_modules/.bin/tsx'), args, {
      cwd: join(worktree, 'app'),
      env: { ...process.env, TOKENHUB_API_KEY: dryRun ? '' : process.env.TOKENHUB_API_KEY },
      // Provider logs are not provenance, but their per-call token usage is the only spend record.
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', resolve);
  });
  assert.equal(exitCode, 0, `Production subprocess failed; inspect ${output}`);
  const raw = JSON.parse(readFileSync(output, 'utf8')) as ProductionRawOutput;
  validateProductionRaw(raw, dryRun);
  assert.equal(raw.source.dryRun, dryRun, 'Subprocess run mode differs');
  console.log(`Verified raw output: ${output}`);
  if (dryRun) console.log('Dry run complete, including local OCR; no production baselines written.');
  else for (const file of writeProductionBaselines(raw)) console.log(`Production baseline: ${file}`);
}

main().catch((error) => {
  const key = process.env.TOKENHUB_API_KEY;
  const message = error instanceof Error ? error.message : String(error);
  console.error(key ? message.replaceAll(key, '[REDACTED]') : message);
  process.exitCode = 1;
});

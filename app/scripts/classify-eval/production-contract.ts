import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const PRODUCTION_PATCH_PATH = join(__dirname, 'patches/production-5a19b7f.patch');
export const PRODUCTION_TOKENHUB_PATH = 'app/src/lib/ai/providers/tokenhub.ts';
export const PRODUCTION_TOKENHUB_BLOB = '06a5cfc1e0eec0824b3c91fda6c249d90d6babd8';
export const PRODUCTION_LOCKFILES = {
  'app/package-lock.json': 'e998a8edace813bdc33880ba629ab670c96f8af4fe66d3472a7033595fc1e7dd',
  'packages/core/package-lock.json': '465985793d7630bd7ff724bbbcaf67423611c8037a90c06b221eff8550b95941',
} as const;
export const PRODUCTION_DEPENDENCIES = { sharp: '0.35.4', appZod: '4.6.7', coreZod: '4.6.7' } as const;
export const PRODUCTION_NODE_VERSION = 'v24.22.1';
export const PRODUCTION_MODULE_PATHS = {
  sharp: 'app/node_modules/sharp/dist/index.cjs',
  appZod: 'app/node_modules/zod/index.cjs',
  coreZod: 'packages/core/node_modules/zod/index.cjs',
  core: 'packages/core/src/index.ts',
  provider: 'app/src/lib/ai/provider.ts',
  tokenhub: PRODUCTION_TOKENHUB_PATH,
  imageSecurity: 'app/src/lib/image-security.ts',
  depositMarkOcr: 'app/src/lib/deposit-mark-ocr.ts',
} as const;

export function productionPatchDigest(): string {
  return createHash('sha256').update(readFileSync(PRODUCTION_PATCH_PATH)).digest('hex');
}

export const PRODUCTION_LOCKFILES = {
  'app/package-lock.json': 'bf0322b3908bd32f8c203b79f4f5876b7ceff3ad42a04710bf7ee4cbb8f8de6d',
  'packages/core/package-lock.json': '465985793d7630bd7ff724bbbcaf67423611c8037a90c06b221eff8550b95941',
} as const;
export const PRODUCTION_DEPENDENCIES = { sharp: '0.35.5', appZod: '4.6.7', coreZod: '4.6.7' } as const;
export const PRODUCTION_MODELS = { text: 'hy3', image: 'kimi-k3.1-pro-highspeed' } as const;
export const PRODUCTION_NODE_VERSION = 'v24.22.1';
export const PRODUCTION_MODULE_PATHS = {
  sharp: 'app/node_modules/sharp/dist/index.cjs',
  appZod: 'app/node_modules/zod/index.cjs',
  coreZod: 'packages/core/node_modules/zod/index.cjs',
  core: 'packages/core/src/index.ts',
  provider: 'app/src/lib/ai/provider.ts',
  tokenhub: 'app/src/lib/ai/providers/tokenhub.ts',
  imageSecurity: 'app/src/lib/image-security.ts',
} as const;

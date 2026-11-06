export const PRODUCTION_LOCKFILES = {
  'app/package-lock.json': '92d6ddaedafafb51665044a5e02b527822983d7785adc33dd2079ed82a7acede',
  'packages/core/package-lock.json': '465985793d7630bd7ff724bbbcaf67423611c8037a90c06b221eff8550b95941',
} as const;
export const PRODUCTION_DEPENDENCIES = { sharp: '0.35.5', appZod: '4.6.7', coreZod: '4.6.7' } as const;
export const PRODUCTION_MODELS = { text: 'hy3', image: 'kimi-k3.1-pro' } as const;
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

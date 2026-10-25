import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Existing effects intentionally synchronize UI state with browser APIs
      // and asynchronous requests; rewriting those flows is outside this
      // framework/security upgrade.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'scripts/classify-eval/results/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;

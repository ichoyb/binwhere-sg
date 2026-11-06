import assert from 'node:assert/strict';
import type { ConfigContext, ExpoConfig } from 'expo/config';
import appConfig from './app.config';

const SENTRY = {
  EXPO_PUBLIC_SENTRY_DSN: 'https://public@example.invalid/1',
  SENTRY_ORG: 'yu-bo',
  SENTRY_PROJECT: 'binwhere-mobile',
};
const ENV_KEYS = ['EAS_BUILD', 'EXPO_PUBLIC_APP_ENV', ...Object.keys(SENTRY)];

function run(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

function evaluate(env: Record<string, string>): ExpoConfig {
  const saved = ENV_KEYS.map((key) => [key, process.env[key]] as const);
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, env);
  try {
    return appConfig({ config: {} } as ConfigContext);
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function sentryPlugin(config: ExpoConfig) {
  return config.plugins?.find((plugin) => Array.isArray(plugin) && plugin[0] === '@sentry/react-native/expo');
}

// eas-cli reads the config with only the profile's `env` to find the project
// before it loads the EAS variables. Throwing there stops every EAS build.
run('eas-cli can read the production profile before loading EAS variables', () => {
  assert.equal(sentryPlugin(evaluate({ EXPO_PUBLIC_APP_ENV: 'production' })), undefined);
});

run('the EAS builder refuses a production build without Sentry', () => {
  assert.throws(
    () => evaluate({ EAS_BUILD: 'true', EXPO_PUBLIC_APP_ENV: 'production' }),
    /EXPO_PUBLIC_APP_ENV=production requires EXPO_PUBLIC_SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT/,
  );
});

run('the EAS builder adds the Sentry upload plugin for a configured production build', () => {
  const config = evaluate({ EAS_BUILD: 'true', EXPO_PUBLIC_APP_ENV: 'production', ...SENTRY });
  assert.deepEqual(sentryPlugin(config), [
    '@sentry/react-native/expo',
    { organization: 'yu-bo', project: 'binwhere-mobile' },
  ]);
});

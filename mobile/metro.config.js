const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const coreRoot = path.resolve(workspaceRoot, 'packages/core');

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/**
 * npm links `file:../packages/core` without installing core's own dependencies,
 * so a clean checkout has no packages/core/node_modules. Metro then resolves
 * them through the nodeModulesPaths fallback below and silently bundles
 * whatever mobile/node_modules holds: a transitive zod 3, while core is written
 * against zod 4, which crashed a clean EAS build at launch. Refuse to bundle
 * unless core's installed dependencies match its lockfile. EAS installs them
 * via the eas-build-pre-install script; locally and in CI it is the same
 * `npm ci` in packages/core.
 */
function assertCoreDependenciesInstalled() {
  const { dependencies = {} } = readJson(path.join(coreRoot, 'package.json'));
  const { packages: locked } = readJson(path.join(coreRoot, 'package-lock.json'));
  const mismatches = Object.keys(dependencies).flatMap((name) => {
    const expected = locked[`node_modules/${name}`]?.version;
    const manifest = path.join(coreRoot, 'node_modules', name, 'package.json');
    const installed = fs.existsSync(manifest) ? readJson(manifest).version : undefined;
    if (expected !== undefined && installed === expected) return [];
    return [`${name} (lockfile ${expected ?? 'missing'}, installed ${installed ?? 'none'})`];
  });
  if (mismatches.length > 0) {
    throw new Error(
      `@binwhere/core dependencies do not match packages/core/package-lock.json: ${mismatches.join(', ')}. ` +
        'Run `npm ci` in packages/core (from mobile/: `npm run eas-build-pre-install`).',
    );
  }
}

assertCoreDependenciesInstalled();

/**
 * Sentry's wrapper around Expo's default Metro config. It adds debug ids to
 * bundles and source maps so a crash on a user's phone symbolicates back to
 * TypeScript lines; without it, release stack traces are minified noise.
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getSentryExpoConfig(projectRoot);

// Allow importing @binwhere/core from packages/core
config.watchFolders = [coreRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(coreRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;

module.exports = config;

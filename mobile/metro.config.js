const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const coreRoot = path.resolve(workspaceRoot, 'packages/core');

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

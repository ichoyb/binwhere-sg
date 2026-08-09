const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');
const coreRoot = path.resolve(workspaceRoot, 'packages/core');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Allow importing @binwhere/core from packages/core
config.watchFolders = [coreRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(coreRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;

module.exports = config;

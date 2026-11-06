import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type NodePin = { node?: string };
type BuildProfile = NodePin & { extends?: string; ios?: NodePin; android?: NodePin };

const nvmrc = readFileSync(join(__dirname, '..', '.nvmrc'), 'utf8').trim();
const profiles: Record<string, BuildProfile> = JSON.parse(
  readFileSync(join(__dirname, 'eas.json'), 'utf8'),
).build;

function run(name: string, fn: () => void) {
  fn();
  console.log(`PASS ${name}`);
}

// Mirrors @expo/eas-json: a profile overrides the one it extends, and a platform section
// overrides the profile's common fields.
function resolveProfile(name: string, depth = 0): BuildProfile {
  assert.ok(depth < 5, `eas.json: the extends chain through ${name} is too long or a cycle`);
  const profile = profiles[name];
  assert.ok(profile, `eas.json: build profile ${name} does not exist`);
  const { extends: parent, ...rest } = profile;
  if (!parent) return rest;
  const base = resolveProfile(parent, depth + 1);
  return {
    ...base,
    ...rest,
    ios: { ...base.ios, ...rest.ios },
    android: { ...base.android, ...rest.android },
  };
}

// A profile without `node` installs and bundles with the build image's Node. The SDK 58 image
// ships Node 22, whose npm 10 ignores package.json `allowScripts` and runs every install script.
for (const name of Object.keys(profiles)) {
  run(`eas.json ${name} builds with Node ${nvmrc} from .nvmrc`, () => {
    const { ios, android, ...common } = resolveProfile(name);
    assert.equal({ ...common, ...ios }.node, nvmrc, 'ios');
    assert.equal({ ...common, ...android }.node, nvmrc, 'android');
  });
}

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] ?? fileURLToPath(new URL('../assets/map-assets', import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as {
  files: Record<string, { bytes: number; sha256: string }>;
};

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}

const expected = Object.keys(manifest.files).map((name) => resolve(root, name)).sort();
const actual = filesIn(root).filter((path) => path !== join(root, 'manifest.json')).map((path) => resolve(path)).sort();
assert.deepEqual(actual, expected, 'Map asset inventory differs from manifest');
for (const [name, entry] of Object.entries(manifest.files)) {
  const data = readFileSync(join(root, name));
  assert.equal(data.byteLength, entry.bytes, `${name}: byte count mismatch`);
  assert.equal(createHash('sha256').update(data).digest('hex'), entry.sha256, `${name}: SHA256 mismatch`);
}
console.log(`PASS map asset manifest (${expected.length} files)`);

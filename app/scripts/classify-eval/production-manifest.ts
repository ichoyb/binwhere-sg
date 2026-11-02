import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

import { BCRS_IMAGE_CASES, BCRS_IMAGE_SOURCES, BCRS_TEXT_CASES } from './bcrs-test-cases';
import { TEST_ITEMS } from './test-items';
import { CACHE_DIR } from './image-fixtures';
import type { ManifestCase, ProductionManifest } from './production-types';

/** Paths transport bytes between checkouts; only portable inputs bind their identity. */
export function manifestDigest(cases: readonly ManifestCase[]): string {
  return createHash('sha256').update(JSON.stringify(cases.map((entry) => ({
    id: entry.id, mode: entry.mode, locale: entry.locale, text: entry.text,
    imageSha256: entry.image?.sha256, crop: entry.image?.crop,
  })))).digest('hex');
}

/** This function is also used in shallow CI and never reads the fixture cache. */
export function currentManifestCases(cacheDirectory = CACHE_DIR): ManifestCase[] {
  const sources = new Map(BCRS_IMAGE_SOURCES.map((source) => [source.id, source]));
  return [
    ...TEST_ITEMS.map((item, index) => ({
      id: `consumer-text-${index + 1}`, suite: 'text' as const, mode: 'text' as const,
      locale: 'en' as const, text: item.text,
    })),
    ...BCRS_TEXT_CASES.map((entry) => ({
      id: entry.id, suite: 'bcrs' as const, mode: 'text' as const, locale: entry.locale, text: entry.text,
    })),
    ...BCRS_IMAGE_CASES.map((entry) => {
      const source = sources.get(entry.sourceId);
      assert.ok(source, `Missing image source ${entry.sourceId}`);
      return {
        id: entry.id, suite: 'bcrs' as const, mode: 'image' as const, locale: entry.locale,
        image: { sourceId: source.id, path: resolve(cacheDirectory, source.filename),
          sha256: source.sha256, crop: source.crop },
      };
    }),
  ];
}

export const CURRENT_MANIFEST_DIGEST = manifestDigest(currentManifestCases());

export function exportProductionManifest(outputPath: string, cacheDirectory = CACHE_DIR): ProductionManifest {
  assert.ok(isAbsolute(outputPath), 'Manifest output path must be absolute');
  const repository = realpathSync(join(__dirname, '../../..'));
  const destination = join(realpathSync(resolve(outputPath, '..')), outputPath.split('/').at(-1)!);
  const inRepository = relative(repository, destination);
  assert.ok(inRepository.startsWith('../'), 'Manifest must be outside the repository');
  const cases = currentManifestCases(cacheDirectory);
  for (const entry of cases) {
    if (!entry.image) continue;
    const bytes = readFileSync(entry.image.path);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.image.sha256,
      `Fixture SHA-256 mismatch: ${entry.image.path}`);
  }
  const manifest: ProductionManifest = { schemaVersion: 1, digest: manifestDigest(cases), cases };
  writeFileSync(destination, JSON.stringify(manifest, null, 2));
  return manifest;
}

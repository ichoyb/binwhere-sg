// Only Node builtins are runtime imports here. Every classifier dependency is loaded from the worktree.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import type { ProductionContext, ProductionManifest, ProductionRawOutput, ProductionSource } from './production-types';
import type { ClassifyResult } from '@binwhere/core';

function arg(name: string): string {
  const value = process.argv.find((entry) => entry.startsWith(`--${name}=`))?.slice(name.length + 3);
  assert.ok(value, `Missing --${name}`);
  return value;
}

const startedAt = new Date().toISOString();
const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
function redact(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const key = process.env.TOKENHUB_API_KEY;
  return key ? message.replaceAll(key, '[REDACTED]') : message;
}

async function main() {
  const root = realpathSync(arg('worktree'));
  assert.equal(realpathSync(process.cwd()), join(root, 'app'), 'Worker cwd must be worktree/app');
  const manifest = JSON.parse(readFileSync(arg('manifest'), 'utf8')) as ProductionManifest;
  const context = JSON.parse(readFileSync(arg('context'), 'utf8')) as ProductionContext & {
    expected: { modulePaths: Record<string, string>; dependencies: Record<string, string>; nodeVersion: string };
  };
  assert.equal(manifest.schemaVersion, 1);
  // Keep this wire digest identical to production-manifest.ts without importing candidate runtime code.
  assert.equal(manifest.digest, sha256(JSON.stringify(manifest.cases.map((entry) => ({
    id: entry.id, mode: entry.mode, locale: entry.locale, text: entry.text,
    imageSha256: entry.image?.sha256, crop: entry.image?.crop,
  })))), 'Manifest digest changed in transit');
  const appRequire = createRequire(join(root, 'app/package.json'));
  const coreRequire = createRequire(join(root, 'packages/core/package.json'));
  const resolved = {
    sharp: appRequire.resolve('sharp'), appZod: appRequire.resolve('zod'), coreZod: coreRequire.resolve('zod'),
    core: appRequire.resolve('@binwhere/core'),
    provider: appRequire.resolve(join(root, 'app/src/lib/ai/provider.ts')),
    tokenhub: appRequire.resolve(join(root, 'app/src/lib/ai/providers/tokenhub.ts')),
    imageSecurity: appRequire.resolve(join(root, 'app/src/lib/image-security.ts')),
    depositMarkOcr: appRequire.resolve(join(root, 'app/src/lib/deposit-mark-ocr.ts')),
  };
  const modulePaths = Object.fromEntries(Object.entries(resolved).map(([name, file]) => [name,
    relative(root, realpathSync(file)),
  ]));
  assert.deepEqual(modulePaths, context.expected.modulePaths, 'Modules did not resolve from production worktree');
  const sharp = appRequire(resolved.sharp) as typeof import('sharp').default;
  const core = appRequire(resolved.core) as typeof import('@binwhere/core');
  const provider = appRequire(resolved.provider) as typeof import('../../src/lib/ai/provider');
  const tokenhub = appRequire(resolved.tokenhub) as typeof import('../../src/lib/ai/providers/tokenhub');
  const { validateAndSanitizeImage } = appRequire(resolved.imageSecurity) as typeof import('../../src/lib/image-security');
  const { readDepositMarkText } = appRequire(resolved.depositMarkOcr) as {
    readDepositMarkText: (image: string, region: null) => Promise<unknown>;
  };
  const zodVersion = (file: string) => {
    const zod = appRequire(file) as typeof import('zod');
    const { major, minor, patch } = zod.string()._zod.version;
    return `${major}.${minor}.${patch}`;
  };
  const dependencies = { sharp: sharp.versions.sharp, appZod: zodVersion(resolved.appZod), coreZod: zodVersion(resolved.coreZod) };
  assert.deepEqual(dependencies, context.expected.dependencies, 'Loaded dependency versions differ from deployment');
  assert.equal(process.version, context.expected.nodeVersion);
  assert.deepEqual(Object.keys(context.executionPolicy).sort(), Object.keys(provider.DEFAULT_EXECUTION_POLICY).sort(),
    'Execution policy field sets differ');
  const dryRun = process.argv.includes('--dry-run');
  const images = new Map<string, string>();
  const preparedImages: ProductionSource['preparedImages'] = [];

  // The transformation sequence is copied from 5a19b7f composeFixture/loadCleanImage.
  async function loadCleanImage(image: NonNullable<ProductionManifest['cases'][number]['image']>) {
    const cacheKey = `${image.sourceId}:${core.IMAGE_MAX_SIZE}`;
    const cached = images.get(cacheKey);
    if (cached) return cached;
    const raw = readFileSync(image.path);
    assert.equal(sha256(raw), image.sha256, `Image SHA-256 changed: ${image.sourceId}`);
    let submittedPhoto = raw;
    if (image.crop) {
      submittedPhoto = await sharp(raw)
        .extract(image.crop)
        .toBuffer();
    }
    const fixture = await sharp(submittedPhoto)
      .rotate()
      .resize(core.IMAGE_MAX_SIZE, core.IMAGE_MAX_SIZE, { fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: Math.round(core.IMAGE_QUALITY * 100) })
      .toBuffer();
    const clean = await validateAndSanitizeImage(fixture.toString('base64'));
    images.set(cacheKey, clean);
    preparedImages.push({ sourceId: image.sourceId, sha256: sha256(Buffer.from(clean, 'base64')) });
    return clean;
  }
  // Complete all image preparation and independence checks before the first paid call.
  for (const entry of manifest.cases) if (entry.image) await loadCleanImage(entry.image);
  const fingerprints: Array<{ sourceId: string; bytes: Buffer }> = [];
  for (const image of preparedImages) {
    const clean = images.get(`${image.sourceId}:${core.IMAGE_MAX_SIZE}`)!;
    fingerprints.push({ sourceId: image.sourceId, bytes: await sharp(Buffer.from(clean, 'base64'))
      .resize(64, 64, { fit: 'fill' }).greyscale().raw().toBuffer() });
  }
  let closestPair: ProductionSource['imageIndependence']['closestPair'] = null;
  for (let left = 0; left < fingerprints.length; left += 1) {
    for (let right = left + 1; right < fingerprints.length; right += 1) {
      const a = fingerprints[left];
      const b = fingerprints[right];
      assert.equal(a.bytes.length, b.bytes.length);
      const difference = a.bytes.reduce((sum, value, index) => sum + Math.abs(value - b.bytes[index]), 0);
      const similarity = 1 - difference / (a.bytes.length * 255);
      if (!closestPair || similarity > closestPair.similarity) {
        closestPair = { leftSourceId: a.sourceId, rightSourceId: b.sourceId, similarity };
      }
    }
  }
  assert.ok(closestPair && closestPair.similarity < 0.995, 'Production image sources are near duplicates');
  const ocrDiagnostic = dryRun ? await readDepositMarkText(images.values().next().value!, null) : undefined;
  // Production route uses default TokenHub options; no evaluation profile options are injected.
  const classifier = dryRun ? undefined : new tokenhub.TokenHubProvider();
  const results: ProductionRawOutput['results'] = [];
  for (const entry of manifest.cases) {
    const started = Date.now();
    try {
      const image = entry.image ? await loadCleanImage(entry.image) : undefined;
      const result: ClassifyResult | null = dryRun ? null : await provider.classifyItem(
        { image, text: entry.text, locale: entry.locale }, classifier, context.executionPolicy,
      );
      results.push({ id: entry.id, result, durationMs: Date.now() - started });
    } catch (error) {
      results.push({ id: entry.id, result: null, error: redact(error), durationMs: Date.now() - started });
    }
    if (!dryRun && entry !== manifest.cases.at(-1)) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const output: ProductionRawOutput = {
    schemaVersion: 1,
    source: {
      preflight: context.preflight, patchSha256: context.patchSha256, executionPolicy: context.executionPolicy,
      manifestDigest: manifest.digest, modulePaths, dependencies, nodeVersion: process.version,
      policyFieldsMatch: true, dryRun, startedAt, endedAt: new Date().toISOString(),
      imagePipeline: { maxSize: core.IMAGE_MAX_SIZE, quality: core.IMAGE_QUALITY }, preparedImages,
      imageIndependence: { nearDuplicateSimilarityLimit: 0.995, closestPair }, ocrDiagnostic,
    },
    results,
  };
  writeFileSync(arg('output'), JSON.stringify(output, null, 2));
  // The deployed OCR pool retains workers after inference, so writing the artifact is followed by exit.
  process.exit(0);
}

main().catch((error) => {
  writeFileSync(arg('output'), JSON.stringify({ schemaVersion: 1, startedAt, endedAt: new Date().toISOString(), fatalError: redact(error) }, null, 2));
  process.exit(1);
});

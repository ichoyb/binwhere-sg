import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import sharp from 'sharp';

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const standaloneRoot = join(appRoot, '.next', 'standalone');
const deployRoot = join(appRoot, '.next', 'deploy');

if (!existsSync(standaloneRoot)) {
  throw new Error('Missing .next/standalone; run npm run build first');
}

rmSync(deployRoot, { recursive: true, force: true });
cpSync(standaloneRoot, deployRoot, { recursive: true, dereference: true });

const serverRoot = existsSync(join(deployRoot, 'app', 'server.js'))
  ? join(deployRoot, 'app')
  : deployRoot;

if (!existsSync(join(serverRoot, 'server.js'))) {
  throw new Error('Standalone server.js was not generated');
}

function copyOcrRuntime(relativePath) {
  const source = join(appRoot, relativePath);
  const destination = join(serverRoot, relativePath);
  if (!existsSync(source)) throw new Error(`Missing OCR runtime source: ${relativePath}`);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true, dereference: true });
}

copyOcrRuntime('ocr');
for (const relativePath of [
  'node_modules/onnx-ocr-js/package.json',
  'node_modules/onnx-ocr-js/LICENSE',
  'node_modules/onnx-ocr-js/dist/index.mjs',
  'node_modules/onnxruntime-web/package.json',
  'node_modules/onnxruntime-web/dist/ort.node.min.mjs',
  'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs',
  'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
  'node_modules/onnxruntime-common/package.json',
  'node_modules/onnxruntime-common/dist/esm',
  'node_modules/@techstark/opencv-js/package.json',
  'node_modules/@techstark/opencv-js/LICENSE',
  'node_modules/@techstark/opencv-js/dist/opencv.js',
]) copyOcrRuntime(relativePath);

for (const relativePath of [
  'ocr/deposit-mark-worker.mjs',
  'ocr/models/PP-OCRv6_det_small.onnx',
  'ocr/models/PP-OCRv6_rec_small.onnx',
  'ocr/models/ppocrv6_dict.txt',
  'node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
  'node_modules/sharp/package.json',
]) {
  if (!existsSync(join(serverRoot, relativePath))) {
    throw new Error(`Standalone classify runtime is missing ${relativePath}`);
  }
}

cpSync(join(appRoot, 'public'), join(serverRoot, 'public'), { recursive: true });
mkdirSync(join(serverRoot, '.next'), { recursive: true });
cpSync(join(appRoot, '.next', 'static'), join(serverRoot, '.next', 'static'), {
  recursive: true,
});

const forbiddenDirectories = new Set(['.git', 'mobile']);
const forbiddenExtensions = new Set(['.key', '.p12', '.p8', '.pem']);

function sanitizeAndValidate(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    const relativePath = relative(deployRoot, absolutePath);

    if (entry.isSymbolicLink()) {
      const sourcePath = realpathSync(absolutePath);
      const sourceRelativePath = relative(standaloneRoot, sourcePath);
      if (
        sourceRelativePath === '..' ||
        sourceRelativePath.startsWith(`..${sep}`) ||
        isAbsolute(sourceRelativePath)
      ) {
        throw new Error(`Symlink points outside standalone output: ${relativePath}`);
      }

      const sourceStat = statSync(sourcePath);
      rmSync(absolutePath);
      cpSync(sourcePath, absolutePath, {
        recursive: sourceStat.isDirectory(),
        dereference: true,
      });

      if (sourceStat.isDirectory()) {
        sanitizeAndValidate(absolutePath);
        continue;
      }
      if (!sourceStat.isFile()) {
        throw new Error(`Unsupported symlink target in Web artifact: ${relativePath}`);
      }
    } else if (entry.isDirectory()) {
      if (forbiddenDirectories.has(entry.name)) {
        throw new Error(`Forbidden directory in Web artifact: ${relativePath}`);
      }
      sanitizeAndValidate(absolutePath);
      continue;
    } else if (!entry.isFile()) {
      throw new Error(`Unsupported special file in Web artifact: ${relativePath}`);
    }

    if (entry.name === '.env' || entry.name.startsWith('.env.')) {
      rmSync(absolutePath);
      continue;
    }

    const extension = extname(entry.name);
    if (forbiddenExtensions.has(extension)) {
      throw new Error(`Potential key material in Web artifact: ${relativePath}`);
    }
  }
}

sanitizeAndValidate(deployRoot);

async function verifyPackagedOcr() {
  const jpeg = await sharp({
    create: {
      width: 320,
      height: 240,
      channels: 3,
      background: '#ffffff',
    },
  }).jpeg().toBuffer();
  const imageBytes = Uint8Array.from(jpeg);
  const worker = new Worker(join(serverRoot, 'ocr', 'deposit-mark-worker.mjs'));

  try {
    const result = await new Promise((resolveResult, rejectResult) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(value);
      };
      const timer = setTimeout(() => {
        finish(rejectResult, new Error('Packaged OCR inference timed out after 45 seconds'));
      }, 45_000);

      worker.once('message', (message) => finish(resolveResult, message));
      worker.once('error', (error) => finish(rejectResult, error));
      worker.once('exit', (code) => {
        finish(rejectResult, new Error(`Packaged OCR worker exited with code ${code}`));
      });
      worker.postMessage(
        { id: 1, imageBytes: imageBytes.buffer, region: null },
        [imageBytes.buffer],
      );
    });

    if (result?.error) throw new Error(`Packaged OCR inference failed: ${result.error}`);
    if (!Array.isArray(result?.lines)) {
      throw new Error('Packaged OCR worker returned an invalid result');
    }
    console.log(`[package-web] Verified: packaged OCR inference (${result.lines.length} lines)`);
  } finally {
    await worker.terminate();
  }
}

await verifyPackagedOcr();

const deployParts = relative(deployRoot, serverRoot).split(sep).filter(Boolean);
console.log(
  `[package-web] Ready: .next/deploy/${deployParts.length ? `${deployParts.join('/')}/` : ''}server.js`,
);
console.log('[package-web] Verified: no mobile source, Git metadata, env files, or key files');

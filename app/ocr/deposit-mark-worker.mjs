import { readFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parentPort } from 'node:worker_threads';

import cvReadyPromise from '@techstark/opencv-js';
import { ONNXPaddleOCR } from 'onnx-ocr-js';
import * as ort from 'onnxruntime-web';
import sharp from 'sharp';

if (!parentPort) throw new Error('Deposit Mark OCR must run in a worker thread');

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modelRoot = join(appRoot, 'ocr', 'models');

// One inference thread keeps OCR work off the server event loop without multiplying
// CPU use inside the dedicated worker.
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = `${join(appRoot, 'node_modules', 'onnxruntime-web', 'dist')}${sep}`;

let runtimePromise;

async function getRuntime() {
  runtimePromise ??= (async () => {
    const [cv, detModel, recModel, charset] = await Promise.all([
      cvReadyPromise,
      readFile(join(modelRoot, 'PP-OCRv6_det_small.onnx')),
      readFile(join(modelRoot, 'PP-OCRv6_rec_small.onnx')),
      readFile(join(modelRoot, 'ppocrv6_dict.txt'), 'utf8'),
    ]);
    const ocr = new ONNXPaddleOCR({
      use_angle_cls: false,
      limit_side_len: 736,
      det_limit_type: 'min',
      det_db_thresh: 0.3,
      det_db_box_thresh: 0.25,
      det_db_unclip_ratio: 1.6,
      use_dilation: true,
      drop_score: 0.15,
      rec_batch_num: 6,
    });
    const system = await ocr.init({
      cv,
      ort,
      det_model_array_buffer: detModel,
      rec_model_array_buffer: recModel,
      rec_char_dict: charset,
    });
    return { cv, system };
  })();
  return runtimePromise;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function makeMarkTextStrips(image, region, cv) {
  if (!region) return [];

  const left = clamp(Math.floor(region.left * image.cols), 0, image.cols - 1);
  const top = clamp(Math.floor(region.top * image.rows), 0, image.rows - 1);
  const right = clamp(Math.ceil((region.left + region.width) * image.cols), left + 1, image.cols);
  const bottom = clamp(Math.ceil((region.top + region.height) * image.rows), top + 1, image.rows);
  const width = right - left;
  const height = bottom - top;
  const strips = [];

  // Deposit Mark text is stacked in the centre of the three-arrow circle. These
  // overlapping bands feed source pixels directly to the recogniser when generic
  // text detection misses the tiny letters.
  for (const [xRatio, widthRatio] of [[0.2, 0.6], [0.32, 0.36]]) {
    for (const yRatio of [0.3, 0.34, 0.38, 0.42, 0.46, 0.5, 0.54, 0.58, 0.62]) {
      const x = clamp(left + Math.floor(width * xRatio), left, right - 1);
      const y = clamp(top + Math.floor(height * yRatio), top, bottom - 1);
      const stripWidth = clamp(Math.ceil(width * widthRatio), 1, right - x);
      const stripHeight = clamp(Math.ceil(height * 0.12), 1, bottom - y);
      strips.push(image.roi(new cv.Rect(x, y, stripWidth, stripHeight)).clone());
    }
  }
  return strips;
}

function makeUpscaledMarkCrop(image, region, cv) {
  if (!region) return null;
  const horizontalPadding = region.width * 0.15;
  const verticalPadding = region.height * 0.15;
  const left = clamp(
    Math.floor((region.left - horizontalPadding) * image.cols),
    0,
    image.cols - 1,
  );
  const top = clamp(
    Math.floor((region.top - verticalPadding) * image.rows),
    0,
    image.rows - 1,
  );
  const right = clamp(
    Math.ceil((region.left + region.width + horizontalPadding) * image.cols),
    left + 1,
    image.cols,
  );
  const bottom = clamp(
    Math.ceil((region.top + region.height + verticalPadding) * image.rows),
    top + 1,
    image.rows,
  );
  const source = image.roi(new cv.Rect(left, top, right - left, bottom - top));
  const scale = Math.min(8, Math.max(2, 512 / Math.max(source.cols, source.rows)));
  const resized = new cv.Mat();
  cv.resize(
    source,
    resized,
    new cv.Size(Math.round(source.cols * scale), Math.round(source.rows * scale)),
    0,
    0,
    cv.INTER_CUBIC,
  );
  source.delete();
  return resized;
}

function boxCentreIsInsideRegion(box, region, image) {
  if (!region || !Array.isArray(box) || box.length === 0) return false;
  const centreX = box.reduce((sum, point) => sum + point[0], 0) / box.length / image.cols;
  const centreY = box.reduce((sum, point) => sum + point[1], 0) / box.length / image.rows;
  return centreX >= region.left
    && centreX <= region.left + region.width
    && centreY >= region.top
    && centreY <= region.top + region.height;
}

async function readText(imageBytes, region) {
  const { cv, system } = await getRuntime();
  const decoded = await sharp(Buffer.from(imageBytes))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = cv.matFromImageData({
    data: new Uint8ClampedArray(
      decoded.data.buffer,
      decoded.data.byteOffset,
      decoded.data.byteLength,
    ),
    width: decoded.info.width,
    height: decoded.info.height,
  });
  const bgr = new cv.Mat();
  cv.cvtColor(rgba, bgr, cv.COLOR_RGBA2BGR);
  rgba.delete();

  const strips = makeMarkTextStrips(bgr, region, cv);
  const markCrop = makeUpscaledMarkCrop(bgr, region, cv);
  try {
    const [detectedBoxes, detectedText] = await system.execute(bgr, false);
    const [, detectedMarkText] = markCrop
      ? await system.execute(markCrop, false)
      : [[], []];
    const recognisedStrips = strips.length
      ? await system.text_recognizer.execute(strips)
      : [];
    return [
      ...(detectedText ?? []).map(([text, confidence], index) => ({
        text,
        confidence,
        source: boxCentreIsInsideRegion(detectedBoxes?.[index], region, bgr)
          ? 'mark_region'
          : 'full',
      })),
      ...(detectedMarkText ?? []).map(([text, confidence]) => ({
        text,
        confidence,
        source: 'mark_crop',
      })),
      ...recognisedStrips.map(([text, confidence]) => ({ text, confidence, source: 'mark_crop' })),
    ].filter((line) => line.text.trim() !== '' && line.confidence >= 0.15);
  } finally {
    markCrop?.delete();
    for (const strip of strips) strip.delete();
    bgr.delete();
  }
}

let busy = false;
parentPort.on('message', async ({ id, imageBytes, region }) => {
  if (busy) {
    parentPort.postMessage({ id, error: 'Worker received concurrent OCR requests' });
    return;
  }

  busy = true;
  try {
    const lines = await readText(imageBytes, region);
    parentPort.postMessage({ id, lines });
  } catch (error) {
    parentPort.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    busy = false;
  }
});

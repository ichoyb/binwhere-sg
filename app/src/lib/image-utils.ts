import { IMAGE_MAX_SIZE, IMAGE_QUALITY } from '@/lib/constants';

/**
 * Downscale canvas to max dimension and return base64 JPEG.
 * Strips the data URL prefix — returns raw base64.
 */
export function compressImage(source: HTMLCanvasElement): string {
  const { width, height } = source;

  let targetW = width;
  let targetH = height;

  if (width > IMAGE_MAX_SIZE || height > IMAGE_MAX_SIZE) {
    const ratio = Math.min(IMAGE_MAX_SIZE / width, IMAGE_MAX_SIZE / height);
    targetW = Math.round(width * ratio);
    targetH = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, targetW, targetH);

  const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
  // Strip "data:image/jpeg;base64,"
  return dataUrl.split(',')[1];
}

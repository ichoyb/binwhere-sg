import { IMAGE_MAX_SIZE } from '@binwhere/core';

export function classifyImageSize(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, IMAGE_MAX_SIZE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

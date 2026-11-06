import { IMAGE_MAX_SIZE, IMAGE_QUALITY } from '@binwhere/core';
import * as ImageManipulator from 'expo-image-manipulator';

export interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
}

/**
 * Fit a photo inside IMAGE_MAX_SIZE on both edges without enlarging it, and compress it
 * to raw base64 JPEG (no data-URL prefix). Matches web `compressImage`, which is also the
 * size every classify evaluation image is sent at; resizing by width alone sent portrait
 * photos at 2048×2731.
 */
export async function prepareImageForClassify({ uri, width, height }: CapturedPhoto): Promise<string> {
  const actions = Math.max(width, height) > IMAGE_MAX_SIZE
    ? [{ resize: width >= height ? { width: IMAGE_MAX_SIZE } : { height: IMAGE_MAX_SIZE } }]
    : [];
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    actions,
    {
      compress: IMAGE_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!manipulated.base64) {
    throw new Error('Image compression produced no base64 output');
  }

  return manipulated.base64;
}

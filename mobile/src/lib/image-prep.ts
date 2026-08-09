import { IMAGE_MAX_SIZE, IMAGE_QUALITY } from '@binwhere/core';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Resize + compress a local image URI to raw base64 JPEG (no data-URL prefix).
 * Matches web `compressImage` contract for `/api/v1/classify`.
 */
export async function prepareImageForClassify(uri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: IMAGE_MAX_SIZE } }],
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

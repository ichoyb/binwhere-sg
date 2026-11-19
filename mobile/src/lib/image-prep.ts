import { IMAGE_QUALITY } from '@binwhere/core';
import { fromByteArray, toByteArray } from 'base64-js';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { classifyImageSize } from './image-size';
import { removeJpegApp1 } from './jpeg-exif';

export interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
}

export async function prepareImageForClassify({ uri }: CapturedPhoto): Promise<string> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const size = classifyImageSize(original.width, original.height);
  const rendered = await ImageManipulator.manipulate(original).resize(size).renderAsync();
  const output = await rendered.saveAsync({ compress: IMAGE_QUALITY, format: SaveFormat.JPEG, base64: true });
  if (!output.base64) throw new Error('Image compression produced no base64 output');
  return fromByteArray(removeJpegApp1(toByteArray(output.base64)));
}

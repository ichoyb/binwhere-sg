import assert from 'node:assert/strict';
import { hasJpegExif, removeJpegApp1 } from './jpeg-exif';

const start = [0xff, 0xd8];
const jfif = [0xff, 0xe0, 0, 7, 0x4a, 0x46, 0x49, 0x46, 0];
const exif = [0xff, 0xe1, 0, 10, 0x45, 0x78, 0x69, 0x66, 0, 0, 1, 2];
const end = [0xff, 0xda, 0, 2, 1, 2, 0xff, 0xd9];
assert.equal(hasJpegExif(new Uint8Array([...start, ...jfif, ...exif, ...end])), true);
assert.equal(hasJpegExif(new Uint8Array([...start, ...jfif, ...end])), false);
assert.equal(hasJpegExif(new Uint8Array([...start, 0xff, 0xe1, 0, 8, 0x58, 0x4d, 0x50, 0, 0, 0, ...end])), false);
assert.equal(hasJpegExif(new Uint8Array([...start, ...end, ...exif])), false);
console.log('PASS JPEG segment scan identifies APP1 Exif and ignores other metadata or compressed image bytes');

const xmp = [0xff, 0xe1, 0, 8, 0x58, 0x4d, 0x50, 0, 0, 0];
const icc = [0xff, 0xe2, 0, 6, 0x49, 0x43, 0x43, 0];
const scan = [0xff, 0xda, 0, 2, 1, 2, 0xff, 0, 0xe1, 0xff, 0xd0, 3];
const eoi = [0xff, 0xd9];
const withoutApp1 = new Uint8Array([...start, ...jfif, ...icc, ...scan, ...eoi]);
const withMetadata = new Uint8Array([...start, ...jfif, ...exif, ...icc, ...scan, ...xmp, ...eoi]);
assert.deepEqual(removeJpegApp1(withMetadata), withoutApp1);
assert.deepEqual(removeJpegApp1(withoutApp1), withoutApp1);
assert.throws(() => removeJpegApp1(withMetadata.subarray(0, -1)), /Invalid JPEG image/);
assert.throws(() => removeJpegApp1(new Uint8Array([...start, 0xff, 0xe1, 0, 80, ...eoi])), /Invalid JPEG image/);
console.log('PASS APP1 removal strips Exif and XMP, preserves ICC and compressed bytes, and rejects truncation');

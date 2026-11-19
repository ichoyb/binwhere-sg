export function hasJpegExif(bytes: Uint8Array): boolean {
  let offset = 2;
  while (offset + 3 < bytes.length && bytes[offset] === 0xff) {
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) return false;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    const length = bytes[offset] * 256 + bytes[offset + 1];
    if (length < 2) return false;
    if (marker === 0xe1 && length >= 8
      && bytes[offset + 2] === 0x45 && bytes[offset + 3] === 0x78
      && bytes[offset + 4] === 0x69 && bytes[offset + 5] === 0x66
      && bytes[offset + 6] === 0 && bytes[offset + 7] === 0) return true;
    offset += length;
  }
  return false;
}

export function removeJpegApp1(bytes: Uint8Array): Uint8Array {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Invalid JPEG image');
  const removed: [number, number][] = [];
  let offset = 2;
  let sawScan = false;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      if (!sawScan) throw new Error('Invalid JPEG image');
      offset++;
      continue;
    }
    const start = offset;
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset === bytes.length) throw new Error('Invalid JPEG image');
    const marker = bytes[offset++];
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      if (!sawScan) throw new Error('Invalid JPEG image');
      continue;
    }
    if (marker === 0x01) continue;
    if (marker === 0xd8) throw new Error('Invalid JPEG image');
    if (marker === 0xd9) {
      if (!sawScan || offset !== bytes.length) throw new Error('Invalid JPEG image');
      const output = new Uint8Array(bytes.length - removed.reduce((sum, [from, to]) => sum + to - from, 0));
      let from = 0;
      let written = 0;
      for (const [start, end] of removed) {
        output.set(bytes.subarray(from, start), written);
        written += start - from;
        from = end;
      }
      output.set(bytes.subarray(from), written);
      return output;
    }
    if (offset + 2 > bytes.length) throw new Error('Invalid JPEG image');
    const length = bytes[offset] * 256 + bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) throw new Error('Invalid JPEG image');
    if (marker === 0xe1) removed.push([start, offset + length]);
    if (marker === 0xda) sawScan = true;
    offset += length;
  }
  throw new Error('Invalid JPEG image');
}

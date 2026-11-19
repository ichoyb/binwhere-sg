export function linkTarget(url: string): 'browser' | 'system' {
  const { protocol } = new URL(url);
  switch (protocol) {
    case 'http:':
    case 'https:':
      return 'browser';
    case 'mailto:':
    case 'tel:':
      return 'system';
    default:
      throw new Error(`Unsupported link scheme: ${protocol}`);
  }
}

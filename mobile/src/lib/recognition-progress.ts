export function recognitionProgress(elapsedMs: number): number {
  return 0.94 * (1 - Math.exp(-elapsedMs / 3500));
}

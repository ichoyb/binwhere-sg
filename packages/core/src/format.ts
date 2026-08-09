/** Format distance for display */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/** Estimate walk time in minutes (assume ~5km/h walking speed) */
export function estimateWalkTime(km: number): number {
  return Math.max(1, Math.round(km * 12));
}

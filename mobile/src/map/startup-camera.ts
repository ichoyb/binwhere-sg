export function startupCameraDecision({ ready, hasLocation, homeVisible, userMoved, decided }: {
  ready: boolean;
  hasLocation: boolean;
  homeVisible: boolean;
  userMoved: boolean;
  decided: boolean;
}): 'wait' | 'skip' | 'fly' {
  if (decided || !ready || !hasLocation) return 'wait';
  return homeVisible && !userMoved ? 'fly' : 'skip';
}

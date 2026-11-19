import { AccessibilityInfo, findNodeHandle, type HostInstance } from 'react-native';

export function announce(message: string) {
  AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
}

export function focusAccessibility(target: HostInstance | null) {
  const handle = findNodeHandle(target);
  if (handle != null) AccessibilityInfo.setAccessibilityFocus(handle);
}

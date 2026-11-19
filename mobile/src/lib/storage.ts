import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Read a JSON value from AsyncStorage.
 * Objects/arrays are JSON.parsed; callers may also pass through encodeHistory/decodeHistory.
 */
export async function getItem<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Write a JSON value to AsyncStorage. */
export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

/** Round-trip helper used by tests and optional call sites. */
export async function roundTripJson<T>(key: string, value: T): Promise<T | null> {
  await setItem(key, value);
  return getItem<T>(key);
}

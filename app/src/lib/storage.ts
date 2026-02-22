/** Safe localStorage wrapper with try/catch */
export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_SESSION_KEY = 'chalega_guest_session';

let guestMode = false;
const listeners = new Set<(enabled: boolean) => void>();

function notify() {
  listeners.forEach(listener => listener(guestMode));
}

export async function hydrateGuestMode(): Promise<boolean> {
  const saved = await AsyncStorage.getItem(GUEST_SESSION_KEY);
  guestMode = saved === 'true';
  notify();
  return guestMode;
}

export async function startGuestSession(): Promise<void> {
  guestMode = true;
  await AsyncStorage.setItem(GUEST_SESSION_KEY, 'true');
  notify();
}

export async function endGuestSession(): Promise<void> {
  guestMode = false;
  await AsyncStorage.removeItem(GUEST_SESSION_KEY);
  notify();
}

export function subscribeToGuestMode(
  listener: (enabled: boolean) => void
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

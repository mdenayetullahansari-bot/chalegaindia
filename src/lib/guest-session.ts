import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const GUEST_SESSION_KEY = 'chalega_guest_session';

let guestMode = false;
const listeners = new Set<(enabled: boolean) => void>();

function notify() {
  listeners.forEach(listener => listener(guestMode));
}

export async function hydrateGuestMode(): Promise<boolean> {
  try {
    const saved = await AsyncStorage.getItem(GUEST_SESSION_KEY);

    if (saved !== 'true') {
      guestMode = false;
      notify();
      return false;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      guestMode = true;
      notify();
      return true;
    }

    const { error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.error('Failed to restore anonymous Supabase session:', error);
      guestMode = false;
      await AsyncStorage.removeItem(GUEST_SESSION_KEY);
      notify();
      return false;
    }

    guestMode = true;
    notify();
    return true;
  } catch (error) {
    console.error('Failed to hydrate guest session:', error);
    guestMode = false;
    notify();
    return false;
  }
}

export async function startGuestSession(): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      const { error } = await supabase.auth.signInAnonymously();

      if (error) {
        console.error('Failed to start anonymous Supabase session:', error);
        throw error;
      }
    }

    guestMode = true;
    await AsyncStorage.setItem(GUEST_SESSION_KEY, 'true');
    notify();
  } catch (error) {
    console.error('Failed to start guest session:', error);
    throw error;
  }
}

export async function endGuestSession(): Promise<void> {
  try {
    guestMode = false;
    await AsyncStorage.removeItem(GUEST_SESSION_KEY);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.is_anonymous) {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Failed to end anonymous Supabase session:', error);
      }
    }

    notify();
  } catch (error) {
    console.error('Failed to end guest session:', error);
    guestMode = false;
    notify();
  }
}

export function subscribeToGuestMode(
  listener: (enabled: boolean) => void
): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}
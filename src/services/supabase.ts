/**
 * Supabase client. Online mode switches on when both keys are in .env;
 * without them the app runs fully offline on the bundled sample questions
 * (handy for anyone trying the open-source repo).
 *
 * Players sign in anonymously: no email, no password.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const ONLINE = Boolean(URL && KEY);

export const supabase: SupabaseClient | null = ONLINE
  ? createClient(URL, KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Only refresh the session while the app is on screen (saves battery).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

let signingIn: Promise<string> | null = null;

/** Signs in anonymously once and returns the user id. */
export function ensureSession(): Promise<string> {
  if (!supabase) return Promise.reject(new Error('Offline mode'));
  if (!signingIn) {
    signingIn = (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) return data.session.user.id;
      const res = await supabase.auth.signInAnonymously();
      if (res.error || !res.data.user) throw new Error(res.error?.message ?? 'Could not sign in');
      return res.data.user.id;
    })().catch((e) => {
      signingIn = null;
      throw e;
    });
  }
  return signingIn;
}

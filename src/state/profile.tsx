import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { nextDayStreak } from '@/game/time';
import { KEYS, loadJson, removeKey, saveJson } from '@/lib/storage';
import { syncProfile } from '@/services/api';
import { ONLINE, supabase } from '@/services/supabase';

export type Profile = {
  nickname: string;
  avatar: string;
  /** Chill mode: only big moments, shown small, no heavy haptics. */
  chill: boolean;
  dayStreak: number;
  bestDayStreak: number;
  /** UTC day of the last ranked run played. */
  lastPlayedDay: string | null;
  createdAt: string;
};

type ProfileCtx = {
  loaded: boolean;
  profile: Profile | null;
  create: (nickname: string, avatar: string) => void;
  update: (patch: Partial<Pick<Profile, 'nickname' | 'avatar' | 'chill'>>) => void;
  /** Call when a ranked run finishes. Returns the new day streak. */
  recordPlay: (day: string) => number;
  reset: () => void;
};

const Ctx = createContext<ProfileCtx | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    loadJson<Profile>(KEYS.profile).then((p) => {
      setProfile(p);
      setLoaded(true);
      if (p && ONLINE) syncProfile(p.nickname, p.avatar).catch(() => {});
    });
  }, []);

  const commit = useCallback((next: Profile | null, prev?: Profile | null) => {
    setProfile(next);
    if (next) saveJson(KEYS.profile, next);
    else removeKey(KEYS.profile);
    // Keep the server's copy of the nickname and avatar in step.
    if (next && ONLINE && (next.nickname !== prev?.nickname || next.avatar !== prev?.avatar)) {
      syncProfile(next.nickname, next.avatar).catch(() => {});
    }
  }, []);

  const create = useCallback(
    (nickname: string, avatar: string) =>
      commit({ nickname, avatar, chill: false, dayStreak: 0, bestDayStreak: 0, lastPlayedDay: null, createdAt: new Date().toISOString() }),
    [commit],
  );

  const update = useCallback<ProfileCtx['update']>((patch) => profile && commit({ ...profile, ...patch }, profile), [profile, commit]);

  const recordPlay = useCallback(
    (day: string) => {
      if (!profile) return 0;
      const dayStreak = nextDayStreak(profile.lastPlayedDay, profile.dayStreak, day);
      commit({ ...profile, dayStreak, bestDayStreak: Math.max(profile.bestDayStreak, dayStreak), lastPlayedDay: day }, profile);
      return dayStreak;
    },
    [profile, commit],
  );

  const reset = useCallback(() => {
    // Online: start as a brand-new anonymous player. Sign out first (local
    // only), so the next nickname goes to the new player, not the old one.
    const out = supabase ? supabase.auth.signOut({ scope: 'local' }).catch(() => {}) : Promise.resolve();
    out.finally(() => {
      commit(null);
      removeKey(KEYS.runs);
    });
  }, [commit]);

  const value = useMemo(() => ({ loaded, profile, create, update, recordPlay, reset }), [loaded, profile, create, update, recordPlay, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile(): ProfileCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}

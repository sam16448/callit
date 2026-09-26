import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { nextDayStreak } from '@/game/time';
import { KEYS, loadJson, removeKey, saveJson } from '@/lib/storage';

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
    });
  }, []);

  const commit = useCallback((next: Profile | null) => {
    setProfile(next);
    if (next) saveJson(KEYS.profile, next);
    else removeKey(KEYS.profile);
  }, []);

  const create = useCallback(
    (nickname: string, avatar: string) =>
      commit({ nickname, avatar, chill: false, dayStreak: 0, bestDayStreak: 0, lastPlayedDay: null, createdAt: new Date().toISOString() }),
    [commit],
  );

  const update = useCallback<ProfileCtx['update']>((patch) => profile && commit({ ...profile, ...patch }), [profile, commit]);

  const recordPlay = useCallback(
    (day: string) => {
      if (!profile) return 0;
      const dayStreak = nextDayStreak(profile.lastPlayedDay, profile.dayStreak, day);
      commit({ ...profile, dayStreak, bestDayStreak: Math.max(profile.bestDayStreak, dayStreak), lastPlayedDay: day });
      return dayStreak;
    },
    [profile, commit],
  );

  const reset = useCallback(() => {
    commit(null);
    removeKey(KEYS.runs);
  }, [commit]);

  const value = useMemo(() => ({ loaded, profile, create, update, recordPlay, reset }), [loaded, profile, create, update, recordPlay, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile(): ProfileCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}

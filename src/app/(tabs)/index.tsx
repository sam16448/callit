import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '@/components/Avatar';
import { CrewIdle } from '@/components/brainrot/CrewDancer';
import { Button, Pill, Screen, SectionLabel, tapLight } from '@/components/ui';
import { BOARDS, boardById, type Board } from '@/game/boards';
import { formatCountdown, msUntilNextRun, utcDay } from '@/game/time';
import { characterIdOf } from '@/lib/avatar';
import { formatPoints } from '@/lib/format';
import { lifetimeAura, rankFor } from '@/lib/rank';
import { canPractice, practiceLabel } from '@/game/practice';
import { api, type BoardStatusRow, type TodayRow } from '@/services/api';
import { practiceServedToday } from '@/services/practice';
import { isBoardPlayable } from '@/services/questions';
import { ONLINE } from '@/services/supabase';
import { useEntitlements } from '@/state/entitlements';
import { useProfile } from '@/state/profile';
import { useRuns } from '@/state/runs';
import { C, F, R, S, T, alpha } from '@/theme';

function useNow(everyMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}

function openRun(board: Board) {
  tapLight();
  router.push({ pathname: '/run/[board]', params: { board: board.id } });
}

/**
 * Online: today's runs on the server (so runs from before a reinstall still show)
 * and which boards have questions yet (Cricket and Bollywood show "Soon" until theirs are added).
 */
function useServerToday() {
  const [rows, setRows] = useState<TodayRow[]>([]);
  const [boards, setBoards] = useState<BoardStatusRow[] | null>(null);
  useFocusEffect(
    useCallback(() => {
      if (!ONLINE) return;
      let live = true;
      api
        .today()
        .then((r) => live && setRows(r))
        .catch(() => {});
      api
        .boardStatus()
        .then((r) => live && setBoards(r))
        .catch(() => {});
      return () => {
        live = false;
      };
    }, []),
  );
  return { rows, boards };
}

/** Practice questions served today, refreshed whenever the tab is shown. */
function usePracticeServed(day: string) {
  const [served, setServed] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      practiceServedToday(day)
        .then((n) => live && setServed(n))
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [day]),
  );
  return served;
}

export default function Play() {
  const { profile } = useProfile();
  const { pro } = useEntitlements();
  const { get, runs } = useRuns();
  const { rows: server, boards: serverBoards } = useServerToday();
  /** Offline: bundled questions decide. Online: the server's board status (open until it has loaded). */
  const playable = (id: Board['id']) =>
    ONLINE ? (serverBoards?.find((b) => b.board === id)?.playable ?? serverBoards === null) : isBoardPlayable(id);
  const now = useNow(30_000);
  const day = utcDay(now);
  const mixed = boardById('mixed')!;
  /** Local record first; otherwise what the server knows. */
  const status = (id: Board['id']) => {
    const local = get(day, id);
    const remote = server.find((r) => r.board === id);
    if (local?.status === 'done' || remote?.finished) return { state: 'done' as const, total: local?.total ?? remote?.total ?? 0, grid: local?.grid };
    if (local || remote) return { state: 'paused' as const, total: remote?.total ?? local?.total ?? 0, grid: local?.grid };
    return null;
  };
  const mixedRun = status('mixed');
  const practiceServed = usePracticeServed(day);
  const openPractice = () => {
    tapLight();
    if (practiceServed !== null && !canPractice(practiceServed, pro)) router.push({ pathname: '/paywall', params: { reason: 'practice_limit' } });
    else router.push('/practice');
  };
  const categories = BOARDS.filter((b) => b.id !== 'mixed');

  const lifetime = lifetimeAura(Object.values(runs).map((r) => r.total));
  const rank = rankFor(lifetime);
  const crew = characterIdOf(profile?.avatar) ?? 'samosa';
  const playedToday = categories.filter((b) => status(b.id)?.state === 'done').length + (mixedRun?.state === 'done' ? 1 : 0);
  const boardCount = categories.length + 1;

  return (
    <Screen tab>
      <View style={styles.top}>
        <View style={styles.me}>
          <View>
            <Avatar value={profile?.avatar} size={48} />
            <View style={styles.rankBadge}>
              <Text style={{ fontSize: 12 }}>{rank.rank.emoji}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hi} numberOfLines={1}>
              {profile?.nickname}
            </Text>
            <Text style={styles.rankTitle}>{rank.rank.title}</Text>
          </View>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statIcon}>⚡</Text>
          <Text style={styles.statText}>{formatPoints(lifetime)}</Text>
        </View>
        <View style={[styles.stat, { borderColor: 'rgba(255,201,64,0.4)' }]}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={[styles.statText, { color: C.gold }]}>{profile?.dayStreak ?? 0}</Text>
        </View>
      </View>

      <Pressable onPress={() => router.push('/how-to-play')} accessibilityRole="button" accessibilityLabel="Your Aura rank" style={styles.rankCard}>
        <View style={styles.rankRow}>
          <Text style={styles.rankLabel}>
            {rank.rank.emoji} {rank.rank.title}
          </Text>
          <Text style={styles.rankNext}>{rank.next ? `${formatPoints(rank.toNext)} Aura to ${rank.next.emoji} ${rank.next.title}` : 'Max rank. Generational.'}</Text>
        </View>
        <View style={styles.rankTrack}>
          <LinearGradient colors={[C.accent, '#3DDCFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.rankFill, { width: `${Math.max(4, rank.progress * 100)}%` }]} />
        </View>
      </Pressable>

      <View style={styles.hero}>
        <LinearGradient colors={['rgba(200,255,46,0.20)', 'rgba(124,108,255,0.10)', C.surface]} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.heroCrew}>
          <CrewIdle id={crew} size={104} />
        </View>
        <View style={styles.heroHead}>
          <View style={styles.liveDot} />
          <Text style={[T.label, { color: C.accent }]}>Daily Mixed · Global board</Text>
        </View>
        <Text style={styles.heroTitle}>10 questions.{'\n'}One shot.</Text>
        <Text style={styles.heroBody}>Same for everyone. New in {formatCountdown(msUntilNextRun(now))}.</Text>
        {mixedRun ? (
          <View style={styles.done}>
            <View style={{ flex: 1 }}>
              <Text style={[T.label, { color: C.muted }]}>{mixedRun.state === 'done' ? 'Your Aura today' : 'Paused at'}</Text>
              <Text style={styles.doneScore}>{formatPoints(mixedRun.total)}</Text>
              {mixedRun.grid ? <Text style={styles.grid}>{mixedRun.grid}</Text> : null}
            </View>
            <View style={{ width: 140 }}>
              <Button title={mixedRun.state === 'done' ? 'Recap' : 'Continue'} variant="subtle" onPress={() => openRun(mixed)} />
            </View>
          </View>
        ) : (
          <View style={{ marginTop: S.lg }}>
            <Button title="PLAY" icon="flash" onPress={() => openRun(mixed)} />
          </View>
        )}
      </View>

      <View style={styles.dayRow}>
        <Text style={styles.dayText}>
          Today: <Text style={{ color: C.text }}>{playedToday}</Text>/{boardCount} boards cleared
        </Text>
        <Pressable onPress={() => router.push('/how-to-play')} accessibilityRole="button" hitSlop={8} style={styles.howLink}>
          <Ionicons name="help-circle-outline" size={16} color={C.muted} />
          <Text style={styles.howText}>How it works</Text>
        </Pressable>
      </View>
      <View style={styles.dayTrack}>
        <View style={[styles.dayFill, { width: `${(playedToday / boardCount) * 100}%` }]} />
      </View>

      <SectionLabel right={<Text style={styles.small}>{ONLINE ? 5 : 3} questions · weekly boards</Text>}>Boards</SectionLabel>
      <View style={styles.tiles}>
        {categories.map((b) => {
          const open = playable(b.id);
          const rec = status(b.id);
          const live = b.id === 'now';
          return (
            <Pressable
              key={b.id}
              disabled={!open}
              onPress={() => openRun(b)}
              accessibilityRole="button"
              accessibilityLabel={`${b.name} run`}
              style={({ pressed }) => [styles.tile, { borderColor: alpha(b.color, 0.35), borderBottomColor: alpha(b.color, 0.7) }, !open && { opacity: 0.4 }, pressed && styles.tilePressed]}
            >
              <LinearGradient colors={[alpha(b.color, 0.22), alpha(b.color, 0.04)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <View style={styles.tileTop}>
                <Text style={styles.tileEmoji}>{b.emoji}</Text>
                {live ? (
                  <View style={[styles.badge, { backgroundColor: b.color }]}>
                    <Text style={styles.badgeText}>LIVE</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.tileName} numberOfLines={1}>
                {b.name}
              </Text>
              <Text style={styles.tileTag} numberOfLines={1}>
                {b.tagline}
              </Text>
              <View style={[styles.tileCta, rec?.state === 'done' ? { backgroundColor: C.surfaceHi } : { backgroundColor: alpha(b.color, 0.18) }]}>
                <Text style={[styles.tileCtaText, { color: rec?.state === 'done' ? C.good : b.color }]} numberOfLines={1}>
                  {rec ? (rec.state === 'done' ? `✓ ${formatPoints(rec.total)}` : 'CONTINUE') : open ? 'PLAY' : 'SOON'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={openPractice} accessibilityRole="button" accessibilityLabel="Practice" style={({ pressed }) => [styles.practice, pressed && { opacity: 0.85 }]}>
        <View style={styles.practiceIcon}>
          <Ionicons name="barbell-outline" size={22} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.practiceTitle}>Practice</Text>
          <Text style={styles.practiceSub}>{practiceServed === null ? "Warm up. Doesn't count for the boards." : practiceLabel(practiceServed, pro)}</Text>
        </View>
        {pro ? <Pill text="PRO" color={C.accentInk} filled={C.accent} /> : <Ionicons name="chevron-forward" size={18} color={C.faint} />}
      </Pressable>
      {ONLINE ? null : <Text style={styles.foot}>Offline demo: 3-question category runs on bundled samples. Add Supabase keys for the full game.</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.sm, marginBottom: S.md },
  me: { flexDirection: 'row', alignItems: 'center', gap: S.md, flex: 1 },
  rankBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.surfaceHi,
    borderWidth: 1.5,
    borderColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hi: { color: C.text, fontFamily: F.black, fontSize: 18 },
  rankTitle: { color: C.accent, fontFamily: F.bold, fontSize: 12.5, marginTop: 1 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, borderRadius: 999, paddingHorizontal: 10, height: 34 },
  statIcon: { fontSize: 14 },
  statText: { color: C.text, fontFamily: F.display, fontSize: 15 },
  rankCard: { backgroundColor: C.surface, borderRadius: R.md, padding: S.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  rankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: S.sm },
  rankLabel: { color: C.text, fontFamily: F.bold, fontSize: 13 },
  rankNext: { color: C.muted, fontFamily: F.medium, fontSize: 12, flexShrink: 1, textAlign: 'right' },
  rankTrack: { height: 8, borderRadius: 999, backgroundColor: C.surfaceHi, marginTop: S.sm, overflow: 'hidden' },
  rankFill: { height: '100%', borderRadius: 999 },
  hero: {
    marginTop: S.lg,
    borderRadius: R.xl,
    padding: S.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.35)',
    backgroundColor: C.surface,
  },
  heroCrew: { position: 'absolute', right: 6, top: 10 },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
  heroTitle: { ...T.hero, color: C.text, fontSize: 36, lineHeight: 39, marginTop: S.md, maxWidth: '72%' },
  heroBody: { ...T.body, color: C.muted, marginTop: S.sm, maxWidth: '80%' },
  done: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.lg },
  doneScore: { fontFamily: F.display, color: C.text, fontSize: 36, marginTop: 2 },
  grid: { fontSize: 14, marginTop: 4, letterSpacing: 1 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.xl },
  dayText: { color: C.muted, fontFamily: F.semibold, fontSize: 13 },
  dayTrack: { height: 6, borderRadius: 999, backgroundColor: C.surfaceHi, marginTop: S.sm, overflow: 'hidden' },
  dayFill: { height: '100%', borderRadius: 999, backgroundColor: C.good },
  howLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  howText: { color: C.muted, fontFamily: F.semibold, fontSize: 12.5 },
  small: { color: C.faint, fontFamily: F.medium, fontSize: 12 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    borderRadius: R.lg,
    padding: S.md,
    paddingTop: S.lg,
    borderWidth: 1,
    borderBottomWidth: 4,
    backgroundColor: C.surface,
    overflow: 'hidden',
  },
  tilePressed: { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  tileEmoji: { fontSize: 30 },
  badge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: '#1A0A00', fontFamily: F.black, fontSize: 10, letterSpacing: 0.8 },
  tileName: { color: C.text, fontFamily: F.black, fontSize: 15.5, marginTop: S.sm },
  tileTag: { color: C.muted, fontFamily: F.body, fontSize: 11.5, marginTop: 2 },
  tileCta: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: S.md },
  tileCtaText: { fontFamily: F.black, fontSize: 12, letterSpacing: 0.6 },
  practice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginTop: S.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  practiceIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  practiceTitle: { color: C.text, fontFamily: F.bold, fontSize: 16 },
  practiceSub: { color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: 1 },
  foot: { ...T.small, color: C.faint, marginTop: S.lg, textAlign: 'center' },
});

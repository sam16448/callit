import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Pill, Screen, SectionLabel, tapLight } from '@/components/ui';
import { BOARDS, boardById, type Board } from '@/game/boards';
import { formatCountdown, msUntilNextRun, utcDay } from '@/game/time';
import { formatPoints } from '@/lib/format';
import { canPractice, practiceLabel } from '@/game/practice';
import { api, type BoardStatusRow, type TodayRow } from '@/services/api';
import { practiceServedToday } from '@/services/practice';
import { isBoardPlayable } from '@/services/questions';
import { ONLINE } from '@/services/supabase';
import { useEntitlements } from '@/state/entitlements';
import { useProfile } from '@/state/profile';
import { useRuns } from '@/state/runs';
import { C, F, R, S, T } from '@/theme';

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
  const { get } = useRuns();
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

  return (
    <Screen tab>
      <View style={styles.top}>
        <View style={styles.me}>
          <Text style={styles.avatar}>{profile?.avatar}</Text>
          <View>
            <Text style={styles.hi}>Hey {profile?.nickname}</Text>
            <Text style={styles.sub}>New runs in {formatCountdown(msUntilNextRun(now))}</Text>
          </View>
        </View>
        <Pill text={`${profile?.dayStreak ?? 0} day streak`} icon="flame" color={C.gold} />
      </View>

      <Card style={styles.hero}>
        <View style={styles.heroHead}>
          <Text style={[T.label, { color: C.accent }]}>Today&apos;s Mixed run</Text>
          <Pill text="Global board" icon="earth" color={C.muted} />
        </View>
        <Text style={styles.heroTitle}>10 questions.{'\n'}One shot.</Text>
        <Text style={styles.heroBody}>Same questions for everyone today. Free, one attempt, 15 seconds each.</Text>
        {mixedRun ? (
          <View style={styles.done}>
            <View style={{ flex: 1 }}>
              <Text style={[T.label, { color: C.muted }]}>{mixedRun.state === 'done' ? 'Your Aura' : 'Paused at'}</Text>
              <Text style={styles.doneScore}>{formatPoints(mixedRun.total)}</Text>
              {mixedRun.grid ? <Text style={styles.grid}>{mixedRun.grid}</Text> : null}
            </View>
            <Button title={mixedRun.state === 'done' ? 'Recap' : 'Continue'} variant="subtle" onPress={() => openRun(mixed)} />
          </View>
        ) : (
          <View style={{ marginTop: S.lg }}>
            <Button title="Play today's run" icon="flash" onPress={() => openRun(mixed)} />
          </View>
        )}
      </Card>

      <Pressable onPress={() => router.push('/how-to-play')} style={styles.howLink} accessibilityRole="button">
        <Ionicons name="help-circle-outline" size={18} color={C.muted} />
        <Text style={styles.howText}>How scoring works</Text>
      </Pressable>

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

      <SectionLabel right={<Text style={styles.small}>5 questions · weekly boards</Text>}>Category runs</SectionLabel>
      <View style={styles.tiles}>
        {categories.map((b) => {
          const open = playable(b.id);
          const rec = status(b.id);
          return (
            <Pressable
              key={b.id}
              disabled={!open}
              onPress={() => openRun(b)}
              accessibilityRole="button"
              accessibilityLabel={`${b.name} run`}
              style={({ pressed }) => [styles.tile, !open && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.tileEmoji}>{b.emoji}</Text>
              <Text style={styles.tileName} numberOfLines={1}>
                {b.name}
              </Text>
              <Text style={[styles.tileMeta, rec && { color: C.accent }]} numberOfLines={1}>
                {rec ? (rec.state === 'done' ? formatPoints(rec.total) : 'Continue') : open ? 'Play' : 'Soon'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {ONLINE ? null : (
        <Text style={styles.foot}>Offline demo: six categories run on bundled sample questions. Add Supabase keys to open all 16 boards.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.sm, marginBottom: S.lg },
  me: { flexDirection: 'row', alignItems: 'center', gap: S.md, flex: 1 },
  avatar: { fontSize: 34 },
  hi: { color: C.text, fontFamily: F.bold, fontSize: 18 },
  sub: { color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: 1 },
  hero: { borderColor: 'rgba(200,255,46,0.35)', borderWidth: 1 },
  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { ...T.h1, color: C.text, fontSize: 34, lineHeight: 38, marginTop: S.md },
  heroBody: { ...T.body, color: C.muted, marginTop: S.sm },
  done: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.lg },
  doneScore: { fontFamily: F.display, color: C.text, fontSize: 36, marginTop: 2 },
  grid: { fontSize: 14, marginTop: 4, letterSpacing: 1 },
  howLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: S.md, marginTop: S.xs },
  howText: { color: C.muted, fontFamily: F.semibold, fontSize: 13.5 },
  small: { color: C.faint, fontFamily: F.medium, fontSize: 12 },
  practice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  practiceIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  practiceTitle: { color: C.text, fontFamily: F.bold, fontSize: 16 },
  practiceSub: { color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  tile: {
    width: '31.8%',
    flexGrow: 1,
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  tileEmoji: { fontSize: 22 },
  tileName: { color: C.text, fontFamily: F.semibold, fontSize: 13, marginTop: S.sm },
  tileMeta: { color: C.muted, fontFamily: F.display, fontSize: 13, marginTop: 2 },
  foot: { ...T.small, color: C.faint, marginTop: S.lg, textAlign: 'center' },
});

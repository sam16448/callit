import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Pill, Screen, SectionLabel, tapLight } from '@/components/ui';
import { BOARDS, boardById, type Board } from '@/game/boards';
import { formatCountdown, msUntilNextRun, utcDay } from '@/game/time';
import { formatPoints } from '@/lib/format';
import { isBoardPlayable } from '@/services/questions';
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

export default function Play() {
  const { profile } = useProfile();
  const { get } = useRuns();
  const now = useNow(30_000);
  const day = utcDay(now);
  const mixed = boardById('mixed')!;
  const mixedRun = get(day, 'mixed');
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
              <Text style={[T.label, { color: C.muted }]}>{mixedRun.status === 'done' ? 'Your score' : 'Run ended early'}</Text>
              <Text style={styles.doneScore}>{formatPoints(mixedRun.total)}</Text>
              <Text style={styles.grid}>{mixedRun.grid}</Text>
            </View>
            <Button title="Recap" variant="subtle" onPress={() => openRun(mixed)} />
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

      <SectionLabel right={<Text style={styles.small}>5 questions · weekly boards</Text>}>Category runs</SectionLabel>
      <View style={styles.tiles}>
        {categories.map((b) => {
          const playable = isBoardPlayable(b.id);
          const rec = get(day, b.id);
          return (
            <Pressable
              key={b.id}
              disabled={!playable}
              onPress={() => openRun(b)}
              accessibilityRole="button"
              accessibilityLabel={`${b.name} run`}
              style={({ pressed }) => [styles.tile, !playable && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
            >
              <Text style={styles.tileEmoji}>{b.emoji}</Text>
              <Text style={styles.tileName} numberOfLines={1}>
                {b.name}
              </Text>
              <Text style={[styles.tileMeta, rec && { color: C.accent }]} numberOfLines={1}>
                {rec ? formatPoints(rec.total) : playable ? 'Play' : 'Soon'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.foot}>Offline preview: six categories run on bundled sample questions. All 16 boards go live when the question bank is connected.</Text>
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

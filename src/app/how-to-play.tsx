import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { CallTag } from '@/components/CallTag';
import { BackBar, Card, Screen, SectionLabel } from '@/components/ui';
import { DEFAULT_CAPTIONS, type MomentId } from '@/game/moments';
import { QUESTION_MS, callRange } from '@/game/scoring';
import { CALLS } from '@/game/types';
import { formatPoints } from '@/lib/format';
import { C, F, S, T } from '@/theme';

const BIG: MomentId[] = ['allin_hit', 'allin_miss', 'clutch', 'perfect_run', 'new_number_one'];
const SMALL: MomentId[] = ['speedrun', 'heating_up', 'unstoppable', 'six_seven', 'streak_milestone'];

export default function HowToPlay() {
  return (
    <Screen>
      <BackBar onBack={() => router.back()} close title="How to play" />
      <Text style={[T.h1, { color: C.text }]}>Read it. Call it. Answer it.</Text>
      <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>
        Each question shows its opening words first. Decide how sure you are before you see the options, then you have {QUESTION_MS / 1000} seconds.
      </Text>

      <SectionLabel>The calls</SectionLabel>
      <Card style={{ gap: S.lg }}>
        {CALLS.map((c) => {
          const r = callRange(c);
          return (
            <View key={c} style={styles.row}>
              <CallTag call={c} size="md" />
              <Text style={styles.cell}>right: up to {formatPoints(r.best, { sign: true })}</Text>
              <Text style={[styles.cell, { color: r.worst < 0 ? C.bad : C.muted }]}>wrong: {formatPoints(r.worst)}</Text>
            </View>
          );
        })}
      </Card>
      <Text style={styles.note}>Right = (100 + speed bonus up to 50) × your call. Running out of time counts as wrong.</Text>

      <SectionLabel>Fair by design</SectionLabel>
      <Card style={{ gap: S.md }}>
        <Text style={styles.fact}>• Every ranked run is free, one attempt, and the same for everyone that day.</Text>
        <Text style={styles.fact}>• Only the Mixed run counts for the global board, so playing more categories can&apos;t buy rank.</Text>
        <Text style={styles.fact}>• Call It Pro never gives points. It&apos;s practice, leagues, stats and cosmetics.</Text>
        <Text style={styles.fact}>• New runs at 00:00 UTC (5:30 AM IST). Weekly boards reset Monday.</Text>
      </Card>

      <SectionLabel>Moments</SectionLabel>
      <Card style={{ gap: S.md }}>
        {[...BIG, ...SMALL].map((id) => {
          const m = DEFAULT_CAPTIONS[id];
          return (
            <View key={id} style={styles.moment}>
              <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.momentTitle}>{m.title}</Text>
                <Text style={styles.momentSub}>{m.sub}</Text>
              </View>
            </View>
          );
        })}
      </Card>
      <Text style={styles.note}>One moment per question. Tap to skip, or turn on Chill mode in You.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  cell: { flex: 1, color: C.text, fontFamily: F.medium, fontSize: 13.5 },
  note: { ...T.small, color: C.faint, marginTop: S.md },
  fact: { color: C.text, fontFamily: F.body, fontSize: 14.5, lineHeight: 21 },
  moment: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  momentTitle: { color: C.text, fontFamily: F.display, fontSize: 16 },
  momentSub: { color: C.muted, fontFamily: F.body, fontSize: 13 },
});

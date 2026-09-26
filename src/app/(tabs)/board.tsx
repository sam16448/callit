import { StyleSheet, Text, View } from 'react-native';
import { Card, PageHeader, Row, Screen, SectionLabel } from '@/components/ui';
import { BOARDS } from '@/game/boards';
import { weekStart } from '@/game/time';
import { formatPoints } from '@/lib/format';
import { useProfile } from '@/state/profile';
import { useRuns } from '@/state/runs';
import { C, S, T } from '@/theme';

/**
 * Offline for now: shows only your own runs this week. The live boards
 * (global Mixed + 15 weekly category boards, "Near you") come from Supabase.
 * No fake players: until then it honestly shows just you.
 */
export default function BoardTab() {
  const { profile } = useProfile();
  const { runs } = useRuns();
  const week = weekStart();
  const mine = Object.values(runs).filter((r) => r.day >= week);

  return (
    <Screen tab>
      <PageHeader title="Board" sub={`Week of ${week} · resets Monday 00:00 UTC`} />
      <Card>
        <Text style={[T.h2, { color: C.text }]}>Live boards are coming</Text>
        <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>
          The global board (Mixed runs only) and weekly category boards switch on when the online question bank is connected. Top 3 each week get badges.
        </Text>
      </Card>
      <SectionLabel>Your runs this week</SectionLabel>
      {mine.length === 0 ? (
        <Text style={[T.body, { color: C.faint }]}>No runs yet this week.</Text>
      ) : (
        <Card style={{ paddingVertical: S.sm }}>
          {mine
            .sort((a, b) => (a.day < b.day ? 1 : -1))
            .map((r) => {
              const b = BOARDS.find((x) => x.id === r.board);
              return (
                <Row
                  key={`${r.day}:${r.board}`}
                  leading={<Text style={{ fontSize: 20 }}>{b?.emoji}</Text>}
                  title={`${b?.name ?? r.board} · ${r.day}`}
                  sub={r.grid}
                  right={<Text style={styles.pts}>{formatPoints(r.total)}</Text>}
                />
              );
            })}
        </Card>
      )}
      <View style={{ height: S.lg }} />
      <Text style={[T.small, { color: C.faint, textAlign: 'center' }]}>Playing as {profile?.avatar} {profile?.nickname}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pts: { color: C.text, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 17 },
});

import { StyleSheet, Text } from 'react-native';
import { Leaderboard } from '@/components/Leaderboard';
import { Card, PageHeader, Row, Screen, SectionLabel } from '@/components/ui';
import { BOARDS } from '@/game/boards';
import { weekStart } from '@/game/time';
import { formatPoints } from '@/lib/format';
import { shortDay } from '@/lib/share';
import { ONLINE } from '@/services/supabase';
import { useRuns } from '@/state/runs';
import { C, F, S, T } from '@/theme';

export default function BoardTab() {
  return ONLINE ? <LiveBoard /> : <OfflineBoard />;
}

function LiveBoard() {
  return (
    <Screen tab>
      <PageHeader title="Board" sub={`Week of ${shortDay(weekStart())}`} />
      <Leaderboard />
    </Screen>
  );
}

/** Offline demo: no other players, so it shows your own runs this week. */
function OfflineBoard() {
  const { runs } = useRuns();
  const week = weekStart();
  const mine = Object.values(runs)
    .filter((r) => r.day >= week)
    .sort((a, b) => (a.day < b.day ? 1 : -1));

  return (
    <Screen tab>
      <PageHeader title="Board" sub={`Week of ${shortDay(week)} · resets Monday`} />
      <Card>
        <Text style={[T.h2, { color: C.text }]}>Offline demo</Text>
        <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>
          Live boards need the online question bank (Supabase keys in .env). Until then, here are your own runs this week.
        </Text>
      </Card>
      <SectionLabel>Your runs this week</SectionLabel>
      {mine.length === 0 ? (
        <Text style={[T.body, { color: C.faint }]}>No runs yet this week.</Text>
      ) : (
        <Card style={{ paddingVertical: S.sm }}>
          {mine.map((r) => {
            const b = BOARDS.find((x) => x.id === r.board);
            return (
              <Row
                key={`${r.day}:${r.board}`}
                leading={<Text style={{ fontSize: 20 }}>{b?.emoji}</Text>}
                title={`${b?.name ?? r.board} · ${shortDay(r.day)}`}
                sub={r.grid}
                right={<Text style={styles.pts}>{formatPoints(r.total)}</Text>}
              />
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pts: { color: C.text, fontFamily: F.display, fontSize: 17 },
});

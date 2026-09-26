import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CallTag } from '@/components/CallTag';
import { Card, SectionLabel } from '@/components/ui';
import { DEFAULT_CAPTIONS } from '@/game/moments';
import { formatPoints } from '@/lib/format';
import type { RunRecord } from '@/state/runs';
import { C, F, S, T } from '@/theme';

/** End-of-run recap, built from the saved record so it looks the same when reopened later. */
export function RunSummary({ record, boardName }: { record: RunRecord; boardName: string }) {
  const questions = record.questions ?? [];
  const correct = record.answers.filter((a) => a.correct).length;
  const allins = record.answers.filter((a) => a.call === 'allin');
  let best = 0;
  let cur = 0;
  for (const a of record.answers) {
    cur = a.correct ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  const big = record.biggest ? DEFAULT_CAPTIONS[record.biggest] : null;
  const unanswered = record.questionCount - record.answers.length;

  return (
    <View>
      <Animated.View entering={FadeInDown.duration(300)} style={styles.head}>
        <Text style={[T.label, { color: C.accent }]}>{boardName} · {record.answers.length < record.questionCount ? 'run so far' : 'run complete'}</Text>
        <Text style={styles.total}>{formatPoints(record.total)}</Text>
        <Text style={styles.grid}>{record.grid}</Text>
      </Animated.View>

      <View style={styles.stats}>
        <Stat label="Correct" value={`${correct}/${record.questionCount}`} />
        <Stat label="All-in hits" value={`${allins.filter((a) => a.correct).length}/${allins.length}`} />
        <Stat label="Best streak" value={String(best)} />
      </View>

      {big ? (
        <Card style={styles.big}>
          <Text style={styles.bigEmoji}>{big.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[T.label, { color: C.muted }]}>Biggest moment</Text>
            <Text style={styles.bigTitle}>{big.title}</Text>
            <Text style={styles.bigSub}>{big.sub}</Text>
          </View>
        </Card>
      ) : null}

      <SectionLabel>Question by question</SectionLabel>
      <Card style={{ paddingVertical: S.sm }}>
        {record.answers.map((a, i) => {
          const q = questions.find((x) => x.id === a.questionId);
          return (
            <View key={a.questionId} style={[styles.row, i > 0 && styles.rowLine]}>
              <Text style={styles.num}>{i + 1}</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.q} numberOfLines={2}>
                  {q?.prompt ?? 'Question'}
                </Text>
                <View style={styles.meta}>
                  <CallTag call={a.call} />
                  <Text style={styles.ans} numberOfLines={1}>
                    {q ? q.options[q.answerIndex] : ''}
                  </Text>
                </View>
              </View>
              <Text style={[styles.pts, { color: a.points > 0 ? C.good : a.points < 0 ? C.bad : C.muted }]}>
                {a.choice === null && !a.correct ? 'time' : formatPoints(a.points, { sign: true })}
              </Text>
            </View>
          );
        })}
        {unanswered > 0 ? <Text style={styles.left}>{unanswered} not answered (run ended early)</Text> : null}
      </Card>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[T.label, { color: C.muted, fontSize: 10 }]}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', marginTop: S.md },
  total: { fontFamily: F.display, color: C.text, fontSize: 72, letterSpacing: -2, marginTop: S.sm },
  grid: { fontSize: 20, letterSpacing: 2, marginTop: S.xs },
  stats: { flexDirection: 'row', gap: S.sm, marginTop: S.xl },
  stat: { flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: S.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  statValue: { fontFamily: F.display, color: C.text, fontSize: 24, marginTop: 4 },
  big: { flexDirection: 'row', alignItems: 'center', gap: S.lg, marginTop: S.md, padding: S.lg },
  bigEmoji: { fontSize: 40 },
  bigTitle: { fontFamily: F.display, color: C.text, fontSize: 24, marginTop: 2 },
  bigSub: { color: C.muted, fontFamily: F.body, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  num: { width: 18, color: C.faint, fontFamily: F.display, fontSize: 14 },
  q: { color: C.text, fontFamily: F.medium, fontSize: 13.5, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  ans: { flex: 1, color: C.good, fontFamily: F.semibold, fontSize: 12.5 },
  pts: { fontFamily: F.display, fontSize: 16, minWidth: 48, textAlign: 'right' },
  left: { ...T.small, color: C.faint, paddingVertical: S.md, textAlign: 'center' },
});

import type { RefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { CallTag } from '@/components/CallTag';
import { ShareCard } from '@/components/ShareCard';
import { Card, SectionLabel } from '@/components/ui';
import { formatPoints } from '@/lib/format';
import { lifetimeAura, rankFor, rankUp } from '@/lib/rank';
import { useProfile } from '@/state/profile';
import { runKey, useRuns, type RunRecord } from '@/state/runs';
import { C, F, S, T } from '@/theme';

/** End-of-run recap, built from the saved record so it looks the same when reopened later. */
export function RunSummary({ record, boardName, cardRef }: { record: RunRecord; boardName: string; cardRef?: RefObject<View | null> }) {
  const { profile } = useProfile();
  const { runs } = useRuns();
  // Lifetime Aura with this run counted once, and what it was before it.
  const others = Object.entries(runs)
    .filter(([k]) => k !== runKey(record.day, record.board))
    .map(([, r]) => r.total);
  const before = lifetimeAura(others);
  const after = lifetimeAura([...others, record.total]);
  const rank = rankFor(after);
  const up = record.status === 'done' ? rankUp(before, after) : null;
  const questions = record.questions ?? [];
  const correct = record.answers.filter((a) => a.correct).length;
  const allins = record.answers.filter((a) => a.call === 'allin');
  let best = 0;
  let cur = 0;
  for (const a of record.answers) {
    cur = a.correct ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  const unanswered = record.questionCount - record.answers.length;

  return (
    <View>
      <Text style={[T.label, { color: C.accent, textAlign: 'center', marginBottom: S.md }]}>
        {boardName} · {record.answers.length < record.questionCount ? 'run so far' : 'run complete'}
      </Text>
      <Animated.View entering={FadeInDown.duration(300)}>
        <ShareCard ref={cardRef} record={record} boardName={boardName} nickname={profile?.nickname} avatar={profile?.avatar} />
      </Animated.View>

      {up ? (
        <Animated.View entering={ZoomIn.delay(400).springify().damping(12)} style={styles.rankUp}>
          <Text style={styles.rankUpEmoji}>{up.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rankUpLabel}>RANK UP</Text>
            <Text style={styles.rankUpTitle}>You&apos;re now {up.title}</Text>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.rankLine}>
          <Text style={styles.rankLineText}>
            {rank.rank.emoji} {rank.rank.title} · {formatPoints(after)} lifetime Aura
            {rank.next ? ` · ${formatPoints(rank.toNext)} to ${rank.next.title}` : ''}
          </Text>
        </View>
      )}

      <View style={styles.stats}>
        <Stat label="Correct" value={`${correct}/${record.questionCount}`} />
        <Stat label="All-in hits" value={`${allins.filter((a) => a.correct).length}/${allins.length}`} />
        <Stat label="Best streak" value={String(best)} />
      </View>

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
  stats: { flexDirection: 'row', gap: S.sm, marginTop: S.lg },
  rankUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    marginTop: S.lg,
    padding: S.lg,
    borderRadius: 20,
    backgroundColor: 'rgba(255,201,64,0.14)',
    borderWidth: 1.5,
    borderColor: C.gold,
  },
  rankUpEmoji: { fontSize: 40 },
  rankUpLabel: { color: C.gold, fontFamily: F.black, fontSize: 12, letterSpacing: 2 },
  rankUpTitle: { color: C.text, fontFamily: F.display, fontSize: 22, marginTop: 2 },
  rankLine: { marginTop: S.lg, alignItems: 'center' },
  rankLineText: { color: C.muted, fontFamily: F.semibold, fontSize: 13, textAlign: 'center' },
  stat: { flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: S.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  statValue: { fontFamily: F.display, color: C.text, fontSize: 24, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  num: { width: 18, color: C.faint, fontFamily: F.display, fontSize: 14 },
  q: { color: C.text, fontFamily: F.medium, fontSize: 13.5, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  ans: { flex: 1, color: C.good, fontFamily: F.semibold, fontSize: 12.5 },
  pts: { fontFamily: F.display, fontSize: 16, minWidth: 48, textAlign: 'right' },
  left: { ...T.small, color: C.faint, paddingVertical: S.md, textAlign: 'center' },
});

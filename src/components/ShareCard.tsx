import type { Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DEFAULT_CAPTIONS } from '@/game/moments';
import { formatPoints } from '@/lib/format';
import { shortDay } from '@/lib/share';
import type { RunRecord } from '@/state/runs';
import { C, F, R, S } from '@/theme';

/**
 * The share card: score, Wordle-style grid and the biggest moment, with no
 * spoilers (no questions or answers). It's also the top of the run summary,
 * so what you see is what you share. Captured at 4:5 (1080×1350).
 */
export function ShareCard({ record, boardName, nickname, avatar, ref }: { record: RunRecord; boardName: string; nickname?: string; avatar?: string; ref?: Ref<View> }) {
  const correct = record.answers.filter((a) => a.correct).length;
  const allins = record.answers.filter((a) => a.call === 'allin');
  const big = record.biggest ? DEFAULT_CAPTIONS[record.biggest] : null;

  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.brand}>CALL IT</Text>
        <Text style={styles.meta}>
          {boardName} · {shortDay(record.day)}
        </Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.score} numberOfLines={1} adjustsFontSizeToFit>
          {formatPoints(record.total)}
        </Text>
        {/* 10 squares must fit on one line in the card. */}
        <Text style={[styles.grid, record.questionCount > 5 && styles.gridLong]} numberOfLines={1}>
          {record.grid}
        </Text>
        <Text style={styles.line}>
          {correct}/{record.questionCount} right{allins.length ? ` · ${allins.filter((a) => a.correct).length}/${allins.length} All-in hits` : ''}
        </Text>
      </View>

      {big ? (
        <View style={styles.moment}>
          <Text style={styles.momentEmoji}>{big.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.momentTitle}>{big.title}</Text>
            <Text style={styles.momentSub}>{big.sub}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.moment}>
          <Text style={styles.momentEmoji}>🎯</Text>
          <Text style={[styles.momentSub, { flex: 1 }]}>Same questions for everyone today. Beat this.</Text>
        </View>
      )}

      <View style={styles.bottom}>
        <Text style={styles.player}>{nickname ? `${avatar ?? ''} ${nickname}`.trim() : ''}</Text>
        <Text style={styles.tag}>Skill decides rank.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 4 / 5,
    width: '100%',
    borderRadius: R.xl,
    padding: S.xl,
    backgroundColor: '#140F26',
    borderWidth: 1,
    borderColor: 'rgba(200,255,46,0.35)',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: C.accent, fontFamily: F.display, fontSize: 18, letterSpacing: 3 },
  meta: { color: C.muted, fontFamily: F.semibold, fontSize: 13 },
  middle: { alignItems: 'center' },
  score: { color: C.text, fontFamily: F.display, fontSize: 84, letterSpacing: -2 },
  grid: { fontSize: 24, letterSpacing: 2, marginTop: S.xs },
  gridLong: { fontSize: 19, letterSpacing: 0 },
  line: { color: C.muted, fontFamily: F.semibold, fontSize: 14, marginTop: S.md },
  moment: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: R.lg, padding: S.lg },
  momentEmoji: { fontSize: 36 },
  momentTitle: { color: C.text, fontFamily: F.display, fontSize: 22 },
  momentSub: { color: C.muted, fontFamily: F.body, fontSize: 13 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  player: { color: C.text, fontFamily: F.semibold, fontSize: 14 },
  tag: { color: C.faint, fontFamily: F.medium, fontSize: 12 },
});

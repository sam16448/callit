import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { Card, tapLight } from '@/components/ui';
import { BOARDS } from '@/game/boards';
import type { BoardId } from '@/game/types';
import { nearYou } from '@/lib/board';
import { formatPoints } from '@/lib/format';
import { api, type BoardRow } from '@/services/api';
import { C, F, R, S, T } from '@/theme';

const MEDAL = ['🥇', '🥈', '🥉'];

/**
 * Weekly leaderboard with a board picker and Top / Near you. Pass a league id
 * to show only that league's members (same runs, smaller board).
 */
export function Leaderboard({ leagueId, emptyHint }: { leagueId?: string; emptyHint?: string }) {
  const [board, setBoard] = useState<BoardId>('mixed');
  const [view, setView] = useState<'top' | 'near'>('top');
  const [rows, setRows] = useState<BoardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      setRows(null);
      setError(null);
      api
        .board(board, leagueId)
        .then((r) => live && setRows(r))
        .catch((e: Error) => live && setError(e.message));
      return () => {
        live = false;
      };
    }, [board, leagueId]),
  );

  const shown = rows ? (view === 'top' ? rows : nearYou(rows)) : [];
  const b = BOARDS.find((x) => x.id === board)!;

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
        {BOARDS.map((x) => {
          const on = x.id === board;
          return (
            <Pressable
              key={x.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                tapLight();
                setBoard(x.id);
              }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && { color: C.accentInk }]}>
                {x.emoji} {x.id === 'mixed' ? (leagueId ? 'Mixed' : 'Global') : x.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.segment}>
        {(['top', 'near'] as const).map((v) => (
          <Pressable key={v} onPress={() => setView(v)} style={[styles.seg, view === v && styles.segOn]} accessibilityRole="tab" accessibilityState={{ selected: view === v }}>
            <Text style={[styles.segText, view === v && { color: C.accentInk }]}>{v === 'top' ? 'Top' : 'Near you'}</Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Text style={[T.body, { color: C.bad, marginTop: S.lg }]}>{error}</Text>
      ) : !rows ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: S.xxl }} />
      ) : rows.length === 0 ? (
        <Card style={{ marginTop: S.lg }}>
          <Text style={[T.h2, { color: C.text }]}>No Aura on the board yet this week</Text>
          <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>
            {emptyHint ?? `Play today's ${b.id === 'mixed' ? 'Mixed' : b.name} run and take the top spot.`}
          </Text>
        </Card>
      ) : (
        <Card style={{ marginTop: S.lg, paddingVertical: S.sm, paddingHorizontal: S.md }}>
          {shown.map((r) => (
            <View key={r.user_id} style={[styles.row, r.is_me && styles.rowMe]}>
              <Text style={styles.rank}>{Number(r.rank) <= 3 ? MEDAL[Number(r.rank) - 1] : Number(r.rank)}</Text>
              <Avatar value={r.avatar} size={30} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {r.nickname}
                  {r.is_me ? ' (you)' : ''}
                </Text>
                <Text style={styles.meta}>
                  {Number(r.runs)} {Number(r.runs) === 1 ? 'run' : 'runs'}
                  {r.is_pro ? ' · PRO' : ''}
                </Text>
              </View>
              <Text style={styles.pts}>{formatPoints(Number(r.total))}</Text>
            </View>
          ))}
        </Card>
      )}
      <Text style={[T.small, { color: C.faint, textAlign: 'center', marginTop: S.lg }]}>
        {board === 'mixed' ? (leagueId ? 'Mixed runs this week.' : 'Only Mixed runs count for the global board.') : `Only ${b.name} runs count here.`} Resets
        Monday 5:30 AM IST.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chipScroll: { marginHorizontal: -S.xl },
  chips: { gap: S.sm, paddingHorizontal: S.xl },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.text, fontFamily: F.semibold, fontSize: 13.5 },
  segment: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 999, padding: 4, marginTop: S.lg },
  seg: { flex: 1, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.accent },
  segText: { color: C.muted, fontFamily: F.bold, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, paddingHorizontal: S.sm, borderRadius: R.md },
  rowMe: { backgroundColor: C.accentSoft },
  rank: { width: 28, textAlign: 'center', color: C.muted, fontFamily: F.display, fontSize: 16 },
  name: { color: C.text, fontFamily: F.semibold, fontSize: 15 },
  meta: { color: C.faint, fontFamily: F.body, fontSize: 12, marginTop: 1 },
  pts: { color: C.text, fontFamily: F.display, fontSize: 17 },
});

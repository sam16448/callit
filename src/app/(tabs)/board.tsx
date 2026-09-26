import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, PageHeader, Row, Screen, SectionLabel, tapLight } from '@/components/ui';
import { BOARDS } from '@/game/boards';
import type { BoardId } from '@/game/types';
import { weekStart } from '@/game/time';
import { nearYou } from '@/lib/board';
import { formatPoints } from '@/lib/format';
import { shortDay } from '@/lib/share';
import { api, type BoardRow } from '@/services/api';
import { ONLINE } from '@/services/supabase';
import { useRuns } from '@/state/runs';
import { C, F, R, S, T } from '@/theme';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function BoardTab() {
  return ONLINE ? <LiveBoard /> : <OfflineBoard />;
}

function LiveBoard() {
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
        .board(board)
        .then((r) => live && setRows(r))
        .catch((e: Error) => live && setError(e.message));
      return () => {
        live = false;
      };
    }, [board]),
  );

  const shown = rows ? (view === 'top' ? rows : nearYou(rows)) : [];
  const b = BOARDS.find((x) => x.id === board)!;

  return (
    <Screen tab>
      <PageHeader title="Board" sub={`Week of ${shortDay(weekStart())} · resets Monday 5:30 AM IST`} />
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
                {x.emoji} {x.id === 'mixed' ? 'Global' : x.name}
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
          <Text style={[T.h2, { color: C.text }]}>No scores yet this week</Text>
          <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>Play today&apos;s {b.id === 'mixed' ? 'Mixed' : b.name} run and take the top spot.</Text>
        </Card>
      ) : (
        <Card style={{ marginTop: S.lg, paddingVertical: S.sm, paddingHorizontal: S.md }}>
          {shown.map((r) => (
            <View key={r.user_id} style={[styles.row, r.is_me && styles.rowMe]}>
              <Text style={styles.rank}>{Number(r.rank) <= 3 ? MEDAL[Number(r.rank) - 1] : Number(r.rank)}</Text>
              <Text style={{ fontSize: 22 }}>{r.avatar}</Text>
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
        {board === 'mixed' ? 'Only Mixed runs count for the global board.' : `Only ${b.name} runs count here.`} Top 3 each week get a badge.
      </Text>
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

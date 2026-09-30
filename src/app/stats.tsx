import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BackBar, Button, Card, Screen, SectionLabel } from '@/components/ui';
import { boardById } from '@/game/boards';
import { CALL_LABEL } from '@/game/scoring';
import { formatPoints } from '@/lib/format';
import { lifetimeAura, rankFor } from '@/lib/rank';
import { shortDay } from '@/lib/share';
import { computeStats } from '@/lib/stats';
import { useEntitlements } from '@/state/entitlements';
import { useProfile } from '@/state/profile';
import { useRuns } from '@/state/runs';
import { CALL_COLOR, C, F, R, S, T, alpha } from '@/theme';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Your stats, a Call It Pro perk. Everyone sees the headline numbers; how your
 * calls pay off and your boards are Pro. Pro never changes Aura.
 */
export default function Stats() {
  const { runs } = useRuns();
  const { profile } = useProfile();
  const { pro } = useEntitlements();
  const records = Object.values(runs);
  const s = computeStats(records);
  const lifetime = lifetimeAura(records.map((r) => r.total));
  const rank = rankFor(lifetime);

  return (
    <Screen>
      <BackBar onBack={() => router.back()} close title="Your stats" />
      <Text style={[T.h1, { color: C.text }]}>
        {rank.rank.emoji} {rank.rank.title}
      </Text>
      <Text style={[T.body, { color: C.muted, marginTop: 4 }]}>
        {formatPoints(lifetime)} lifetime Aura · best streak {profile?.bestDayStreak ?? 0} days
      </Text>

      <View style={styles.tiles}>
        <Tile label="Runs" value={String(s.runs)} />
        <Tile label="Accuracy" value={s.answered ? pct(s.accuracy) : '–'} />
        <Tile label="Avg time" value={s.avgSeconds !== null ? `${s.avgSeconds}s` : '–'} />
      </View>

      {s.runs === 0 ? (
        <Card style={{ marginTop: S.xl }}>
          <Text style={[T.h2, { color: C.text }]}>No runs yet</Text>
          <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>Play today&apos;s run and your stats start filling in.</Text>
        </Card>
      ) : (
        <Locked pro={pro}>
          {s.insight ? (
            <Card style={styles.insight}>
              <Ionicons name="bulb-outline" size={20} color={C.gold} />
              <Text style={styles.insightText}>{s.insight}</Text>
            </Card>
          ) : null}

          <SectionLabel>Your calls</SectionLabel>
          <Card style={{ gap: S.lg }}>
            {s.calls.map((c) => (
              <View key={c.call}>
                <View style={styles.rowHead}>
                  <Text style={[styles.rowName, { color: CALL_COLOR[c.call].main }]}>{CALL_LABEL[c.call]}</Text>
                  <Text style={styles.rowMeta}>
                    {c.count ? `${c.hits}/${c.count} right · ${formatPoints(c.net, { sign: true })}` : 'not used yet'}
                  </Text>
                </View>
                <Bar value={c.hitRate} color={CALL_COLOR[c.call].main} />
              </View>
            ))}
            {s.lockins.count ? (
              <View style={styles.rowHead}>
                <Text style={[styles.rowName, { color: C.gold }]}>🔒 Lock-Ins</Text>
                <Text style={styles.rowMeta}>
                  {s.lockins.hits}/{s.lockins.count} hit · {formatPoints(s.lockins.net, { sign: true })}
                </Text>
              </View>
            ) : null}
          </Card>

          <SectionLabel>Your boards</SectionLabel>
          <Card style={{ gap: S.lg }}>
            {s.boards.map((b) => {
              const board = boardById(b.board);
              return (
                <View key={b.board}>
                  <View style={styles.rowHead}>
                    <Text style={styles.rowName}>
                      {board?.emoji} {board?.name ?? b.board}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {pct(b.accuracy)} · {formatPoints(b.aura, { sign: true })}
                    </Text>
                  </View>
                  <Bar value={b.accuracy} color={board?.color ?? C.accent} />
                </View>
              );
            })}
          </Card>

          {s.best ? (
            <>
              <SectionLabel>Best run</SectionLabel>
              <Card style={styles.best}>
                <Text style={{ fontSize: 30 }}>{boardById(s.best.board)?.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>
                    {boardById(s.best.board)?.name} · {shortDay(s.best.day)}
                  </Text>
                  <Text style={styles.grid}>{s.best.grid}</Text>
                </View>
                <Text style={styles.bestPts}>{formatPoints(s.best.total)}</Text>
              </Card>
            </>
          ) : null}
        </Locked>
      )}
      <Text style={styles.note}>Stats come from runs played on this phone.</Text>
    </Screen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[T.label, { color: C.muted, fontSize: 10 }]}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.max(2, Math.round(value * 100))}%`, backgroundColor: color }]} />
    </View>
  );
}

/** Pro content. Free players see it faded under an unlock card. */
function Locked({ pro, children }: { pro: boolean; children: ReactNode }) {
  if (pro) return <>{children}</>;
  return (
    <View>
      <View style={{ opacity: 0.18 }} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {children}
      </View>
      <View style={styles.lockWrap}>
        <Card style={styles.lockCard}>
          <Text style={{ fontSize: 30 }}>📊</Text>
          <Text style={[T.h2, { color: C.text, textAlign: 'center', marginTop: S.sm }]}>See how you really play</Text>
          <Text style={[T.body, { color: C.muted, textAlign: 'center', marginTop: S.xs }]}>
            Which calls pay off, your best boards and your best run. Part of Call It Pro.
          </Text>
          <View style={{ alignSelf: 'stretch', marginTop: S.lg }}>
            <Button title="Unlock with Pro" icon="stats-chart" onPress={() => router.push({ pathname: '/paywall', params: { reason: 'stats' } })} />
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: S.sm, marginTop: S.xl },
  tile: { flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: S.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  tileValue: { fontFamily: F.display, color: C.text, fontSize: 24, marginTop: 4 },
  insight: { flexDirection: 'row', gap: S.md, alignItems: 'center', marginTop: S.xl, borderColor: alpha(C.gold, 0.4), padding: S.lg },
  insightText: { flex: 1, color: C.text, fontFamily: F.medium, fontSize: 14, lineHeight: 20 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: S.sm },
  rowName: { color: C.text, fontFamily: F.bold, fontSize: 15 },
  rowMeta: { color: C.muted, fontFamily: F.medium, fontSize: 13 },
  track: { height: 8, borderRadius: 999, backgroundColor: C.surfaceHi, marginTop: S.sm, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  best: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  grid: { fontSize: 13, marginTop: 4, letterSpacing: 1 },
  bestPts: { fontFamily: F.display, color: C.text, fontSize: 22 },
  lockWrap: { position: 'absolute', top: S.xl, left: 0, right: 0, alignItems: 'center' },
  lockCard: { alignItems: 'center', borderColor: alpha(C.accent, 0.4), borderRadius: R.xl, marginHorizontal: S.sm },
  note: { ...T.small, color: C.faint, textAlign: 'center', marginTop: S.xl },
});

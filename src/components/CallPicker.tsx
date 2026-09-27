import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { tapLight } from '@/components/ui';
import { CALL_LABEL, MULTIPLIER, callRange } from '@/game/scoring';
import { CALLS, type Call } from '@/game/types';
import { formatPoints } from '@/lib/format';
import { CALL_COLOR, C, F, R, S } from '@/theme';

const BLURB: Record<Call, string> = {
  safe: 'No risk',
  sure: 'I think I know',
  allin: 'I definitely know',
};

export const LOCKIN_GOLD = '#FFC940';

/**
 * The three call buttons, plus Generational Lock-In when it's available
 * (once per run, only with Aura on the board this week). Lock-In takes two
 * taps: arm, then confirm, so nobody stakes their week by accident.
 */
export function CallPicker({ onCall, lockinStake, onLockIn }: { onCall: (c: Call) => void; lockinStake?: number | null; onLockIn?: () => void }) {
  const [armed, setArmed] = useState(false);
  const canLock = Boolean(onLockIn && lockinStake && lockinStake > 0);

  return (
    <View style={styles.wrap}>
      {CALLS.map((c) => {
        const col = CALL_COLOR[c];
        const { best, worst } = callRange(c);
        return (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={`${CALL_LABEL[c]}, ${MULTIPLIER[c]} times. Up to ${best} Aura, or ${worst} if wrong.`}
            onPress={() => {
              tapLight();
              setArmed(false);
              onCall(c);
            }}
            style={({ pressed }) => [styles.btn, { borderColor: col.main, backgroundColor: col.soft }, pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <View style={[styles.mult, { backgroundColor: col.main }]}>
              <Text style={[styles.multText, { color: col.ink }]}>{MULTIPLIER[c]}×</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{CALL_LABEL[c]}</Text>
              <Text style={styles.blurb}>{BLURB[c]}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.best, { color: col.main }]}>up to {formatPoints(best, { sign: true })}</Text>
              <Text style={styles.worst}>{worst === 0 ? 'wrong: 0' : `wrong: ${formatPoints(worst)}`}</Text>
            </View>
          </Pressable>
        );
      })}

      {canLock ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={armed ? `Confirm Generational Lock-In, staking ${lockinStake} Aura` : `Generational Lock-In: stake your week's ${lockinStake} Aura`}
          onPress={() => {
            tapLight();
            if (armed) onLockIn?.();
            else setArmed(true);
          }}
          style={({ pressed }) => [styles.lock, armed && styles.lockArmed, pressed && { transform: [{ scale: 0.97 }] }]}
        >
          <Text style={styles.lockIcon}>🔒</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.lockTitle}>{armed ? 'Tap again to lock in' : 'Generational Lock-In'}</Text>
            <Text style={styles.lockSub}>
              {armed ? 'No going back. Played as All-in.' : `Stake your whole week: ${formatPoints(lockinStake ?? 0)} Aura`}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.best, { color: LOCKIN_GOLD }]}>right: week ×2</Text>
            <Text style={styles.worst}>wrong: week → 0</Text>
          </View>
        </Pressable>
      ) : null}
      {armed ? (
        <Animated.Text entering={FadeIn} style={styles.cancel} onPress={() => setArmed(false)} accessibilityRole="button">
          Cancel Lock-In
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: S.md },
  btn: { flexDirection: 'row', alignItems: 'center', gap: S.md, borderWidth: 1.5, borderRadius: R.lg, padding: S.lg, minHeight: 78 },
  mult: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  multText: { fontFamily: F.display, fontSize: 22 },
  name: { color: C.text, fontFamily: F.bold, fontSize: 18 },
  blurb: { color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: 1 },
  best: { fontFamily: F.display, fontSize: 15 },
  worst: { color: C.faint, fontFamily: F.medium, fontSize: 12, marginTop: 2 },
  lock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: LOCKIN_GOLD,
    borderRadius: R.lg,
    padding: S.lg,
    minHeight: 78,
    backgroundColor: 'rgba(255,201,64,0.08)',
  },
  lockArmed: { borderStyle: 'solid', backgroundColor: 'rgba(255,201,64,0.2)' },
  lockIcon: { fontSize: 30, width: 50, textAlign: 'center' },
  lockTitle: { color: LOCKIN_GOLD, fontFamily: F.display, fontSize: 18 },
  lockSub: { color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: 1 },
  cancel: { color: C.muted, fontFamily: F.semibold, fontSize: 13, textAlign: 'center', paddingVertical: S.xs },
});

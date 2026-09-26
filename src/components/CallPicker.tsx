import { Pressable, StyleSheet, Text, View } from 'react-native';
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

/** The three big call buttons. */
export function CallPicker({ onCall }: { onCall: (c: Call) => void }) {
  return (
    <View style={styles.wrap}>
      {CALLS.map((c) => {
        const col = CALL_COLOR[c];
        const { best, worst } = callRange(c);
        return (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={`${CALL_LABEL[c]}, ${MULTIPLIER[c]} times. Up to ${best}, or ${worst} if wrong.`}
            onPress={() => {
              tapLight();
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
});

import { StyleSheet, Text, View } from 'react-native';
import { CALL_LABEL, MULTIPLIER } from '@/game/scoring';
import type { Call } from '@/game/types';
import { CALL_COLOR, F } from '@/theme';

/** Small coloured tag: "ALL-IN 3×". */
export function CallTag({ call, size = 'sm' }: { call: Call; size?: 'sm' | 'md' }) {
  const c = CALL_COLOR[call];
  const md = size === 'md';
  return (
    <View style={[styles.tag, { backgroundColor: c.main }, md && styles.tagMd]}>
      <Text style={[styles.text, { color: c.ink }, md && { fontSize: 13 }]}>
        {CALL_LABEL[call].toUpperCase()} {MULTIPLIER[call]}×
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  tagMd: { paddingHorizontal: 12, paddingVertical: 6 },
  text: { fontFamily: F.black, fontSize: 11, letterSpacing: 0.6 },
});

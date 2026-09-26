import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { QUESTION_MS } from '@/game/scoring';
import { C, F } from '@/theme';

/**
 * Smooth countdown bar. The bar is only a picture: the real time left is
 * worked out from timestamps in the run state, so a dropped frame can't
 * cost (or gift) anyone points.
 */
export function TimerBar({ msLeft, running, color }: { msLeft: number; running: boolean; color: string }) {
  const progress = useSharedValue(msLeft / QUESTION_MS);

  useEffect(() => {
    if (!running) {
      cancelAnimation(progress);
      return;
    }
    progress.value = msLeft / QUESTION_MS;
    progress.value = withTiming(0, { duration: msLeft, easing: Easing.linear });
    // Only restart the animation when the timer starts or stops, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const bar = useAnimatedStyle(() => ({ width: `${Math.max(0, progress.value) * 100}%` }));
  const secs = Math.ceil(msLeft / 1000);
  const low = msLeft <= 5_000;

  return (
    <View style={styles.row}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: low ? C.bad : color }, bar]} />
      </View>
      <Text style={[styles.secs, low && { color: C.bad }]} accessibilityLabel={`${secs} seconds left`}>
        {secs}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { flex: 1, height: 10, borderRadius: 999, backgroundColor: C.surfaceHi, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  secs: { width: 30, textAlign: 'right', color: C.text, fontFamily: F.display, fontSize: 22 },
});

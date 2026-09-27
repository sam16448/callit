import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { QUESTION_MS } from '@/game/scoring';
import { C, F } from '@/theme';

/**
 * Smooth countdown bar. The bar is only a picture: the real time left is
 * worked out from timestamps in the run state, so a dropped frame can't
 * cost (or gift) anyone points. The last 5 seconds turn red and pulse, and
 * the last 3 tick with a light haptic.
 */
export function TimerBar({ msLeft, running, color }: { msLeft: number; running: boolean; color: string }) {
  const progress = useSharedValue(msLeft / QUESTION_MS);
  const pulse = useSharedValue(1);
  const secs = Math.ceil(msLeft / 1000);
  const low = msLeft <= 5_000;

  useEffect(() => {
    if (!running) {
      cancelAnimation(progress);
      return;
    }
    progress.set(msLeft / QUESTION_MS);
    progress.set(withTiming(0, { duration: msLeft, easing: Easing.linear }));
    // Only restart the animation when the timer starts or stops, not on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    if (!running || !low) return;
    pulse.set(withRepeat(withSequence(withTiming(1.25, { duration: 120 }), withTiming(1, { duration: 380 })), -1, false));
    return () => cancelAnimation(pulse);
  }, [running, low, pulse]);

  useEffect(() => {
    if (running && secs > 0 && secs <= 3) Haptics.selectionAsync().catch(() => {});
  }, [running, secs]);

  const bar = useAnimatedStyle(() => ({ width: `${Math.max(0, progress.get()) * 100}%` }));
  const beat = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));

  return (
    <View style={styles.row}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: low ? C.bad : color }, bar]} />
      </View>
      <Animated.Text style={[styles.secs, low && { color: C.bad }, beat]} accessibilityLabel={`${secs} seconds left`}>
        {secs}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { flex: 1, height: 12, borderRadius: 999, backgroundColor: C.surfaceHi, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  secs: { width: 34, textAlign: 'right', color: C.text, fontFamily: F.display, fontSize: 24 },
});

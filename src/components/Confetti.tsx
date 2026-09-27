import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const COLORS = ['#C8FF2E', '#FF3D7F', '#3DDCFF', '#FFC940', '#B983FF', '#3DF29A'];

/** Deterministic "random" in [0, 1) so every render draws the same burst. */
function rand(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function Piece({ i, width, height }: { i: number; width: number; height: number }) {
  const t = useSharedValue(0);
  const startX = rand(i, 1) * width;
  const drift = (rand(i, 2) - 0.5) * 160;
  const spin = (rand(i, 3) - 0.5) * 1080;
  const delay = rand(i, 4) * 350;
  const w = 6 + rand(i, 5) * 6;

  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration: 1600 + rand(i, 6) * 900, easing: Easing.out(Easing.quad) })));
  }, [t, delay, i]);

  const style = useAnimatedStyle(() => {
    const k = t.get();
    return {
      opacity: k < 0.85 ? 1 : (1 - k) / 0.15,
      transform: [{ translateX: startX + drift * k }, { translateY: -40 + (height * 0.9) * k }, { rotate: `${spin * k}deg` }],
    };
  });

  return <Animated.View style={[styles.piece, { width: w, height: w * 1.6, backgroundColor: COLORS[i % COLORS.length] }, style]} />;
}

/** A one-off confetti burst over the screen. Purely decorative; touches pass through. */
export function Confetti({ count = 36 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <Piece key={i} i={i} width={width} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0, left: 0, borderRadius: 2 },
});

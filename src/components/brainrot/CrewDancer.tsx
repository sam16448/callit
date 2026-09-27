import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { CharacterArt } from '@/components/Avatar';
import type { CharacterId } from '@/lib/avatar';

const SPARKS = ['✦', '✧', '✦', '✧', '✦', '✧'];

/**
 * A crew member reacting to a big moment. Wins: bounce and wiggle inside a
 * pulsing aura with orbiting sparkles. Fails: a sad wobble, no sparkles.
 */
export function CrewDancer({ id, mood, tint, size = 170 }: { id: CharacterId; mood: 'win' | 'fail'; tint: string; size?: number }) {
  const beat = useSharedValue(0);
  const pulse = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.inOut(Easing.quad);
    beat.set(withRepeat(withTiming(1, { duration: mood === 'win' ? 380 : 560, easing: ease }), -1, true));
    pulse.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }), -1, false));
    spin.set(withRepeat(withTiming(1, { duration: 4000, easing: Easing.linear }), -1, false));
    return () => {
      cancelAnimation(beat);
      cancelAnimation(pulse);
      cancelAnimation(spin);
    };
  }, [beat, pulse, spin, mood]);

  const body = useAnimatedStyle(() => {
    const t = beat.get();
    return mood === 'win'
      ? { transform: [{ translateY: -22 * t }, { rotate: `${-10 + 20 * t}deg` }, { scale: 1 + 0.06 * t }] }
      : { transform: [{ translateX: -7 + 14 * t }, { rotate: `${8 - 16 * t}deg` }, { scaleY: 1 - 0.1 * t }, { translateY: 8 * t }] };
  });
  const aura = useAnimatedStyle(() => {
    const p = pulse.get();
    return { opacity: 0.55 * (1 - p), transform: [{ scale: 0.85 + 0.5 * p }] };
  });
  const orbit = useAnimatedStyle(() => ({ transform: [{ rotate: `${360 * spin.get()}deg` }] }));

  const box = size * 1.5;
  return (
    <View style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
      <Animated.View style={[styles.aura, { width: size * 1.2, height: size * 1.2, borderRadius: size, borderColor: tint, backgroundColor: `${tint}22` }, aura]} />
      {mood === 'win' ? (
        <Animated.View style={[StyleSheet.absoluteFill, orbit]}>
          {SPARKS.map((s, i) => {
            const a = (i / SPARKS.length) * Math.PI * 2;
            const r = box * 0.42;
            return (
              <Text key={i} style={[styles.spark, { color: tint, left: box / 2 + r * Math.cos(a) - 10, top: box / 2 + r * Math.sin(a) - 12 }]}>
                {s}
              </Text>
            );
          })}
        </Animated.View>
      ) : null}
      <Animated.View style={body}>
        <CharacterArt id={id} size={size} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  aura: { position: 'absolute', borderWidth: 3 },
  spark: { position: 'absolute', fontSize: 22 },
});

/** A crew member idling: a slow bob and sway, for home-screen flair. */
export function CrewIdle({ id, size = 96 }: { id: CharacterId; size?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(t);
  }, [t]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * t.get() }, { rotate: `${-4 + 8 * t.get()}deg` }] }));
  return (
    <Animated.View style={style} pointerEvents="none">
      <CharacterArt id={id} size={size} />
    </Animated.View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { C, F, R, S } from '@/theme';

export type OptionState = 'idle' | 'correct' | 'wrong' | 'dim';

const LETTERS = ['A', 'B', 'C', 'D'];

/** One answer option. Slides in, pops when it's the right answer, shakes when it's your wrong pick. */
export function OptionButton({
  index,
  text,
  state,
  onPress,
  disabled,
  accent = C.accent,
}: {
  index: number;
  text: string;
  state: OptionState;
  onPress: () => void;
  disabled?: boolean;
  accent?: string;
}) {
  const x = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (state === 'wrong') {
      x.set(withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 70 }), withTiming(-6, { duration: 60 }), withTiming(0, { duration: 60 })));
    } else if (state === 'correct') {
      scale.set(withSequence(withTiming(1.04, { duration: 120 }), withSpring(1, { damping: 8 })));
    }
  }, [state, x, scale]);

  const moving = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }, { scale: scale.get() }] }));
  const border = state === 'correct' ? C.good : state === 'wrong' ? C.bad : C.line;
  const bg = state === 'correct' ? C.goodSoft : state === 'wrong' ? C.badSoft : C.surface;

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(260)} style={moving}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Option ${LETTERS[index]}: ${text}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.btn,
          { borderColor: pressed ? accent : border, backgroundColor: bg },
          state === 'dim' && { opacity: 0.4 },
          pressed && { transform: [{ scale: 0.97 }], backgroundColor: C.surfaceHi },
        ]}
      >
        <View style={[styles.letter, state === 'correct' && { backgroundColor: C.good }, state === 'wrong' && { backgroundColor: C.bad }]}>
          {state === 'correct' ? (
            <Ionicons name="checkmark" size={16} color={C.bg} />
          ) : state === 'wrong' ? (
            <Ionicons name="close" size={16} color={C.bg} />
          ) : (
            <Text style={styles.letterText}>{LETTERS[index]}</Text>
          )}
        </View>
        <Text style={styles.text}>{text}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    borderRadius: R.md,
    paddingVertical: 14,
    paddingHorizontal: S.lg,
    minHeight: 62,
  },
  letter: { width: 30, height: 30, borderRadius: 10, backgroundColor: C.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  letterText: { color: C.muted, fontFamily: F.black, fontSize: 13 },
  text: { flex: 1, color: C.text, fontFamily: F.semibold, fontSize: 16, lineHeight: 21 },
});

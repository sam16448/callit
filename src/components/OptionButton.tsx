import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F, R, S } from '@/theme';

export type OptionState = 'idle' | 'correct' | 'wrong' | 'dim';

const LETTERS = ['A', 'B', 'C', 'D'];

export function OptionButton({
  index,
  text,
  state,
  onPress,
  disabled,
}: {
  index: number;
  text: string;
  state: OptionState;
  onPress: () => void;
  disabled?: boolean;
}) {
  const border = state === 'correct' ? C.good : state === 'wrong' ? C.bad : C.line;
  const bg = state === 'correct' ? C.goodSoft : state === 'wrong' ? C.badSoft : C.surface;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Option ${LETTERS[index]}: ${text}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { borderColor: border, backgroundColor: bg },
        state === 'dim' && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.98 }], backgroundColor: C.surfaceHi },
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
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: S.md, borderWidth: 1.5, borderRadius: R.md, paddingVertical: 14, paddingHorizontal: S.lg, minHeight: 60 },
  letter: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  letterText: { color: C.muted, fontFamily: F.bold, fontSize: 13 },
  text: { flex: 1, color: C.text, fontFamily: F.semibold, fontSize: 16, lineHeight: 21 },
});

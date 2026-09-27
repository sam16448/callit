import { StyleSheet, Text, View } from 'react-native';
import Svg from 'react-native-svg';
import { CHARACTER_BY_ID } from '@/components/brainrot/characters';
import { characterIdOf, type CharacterId } from '@/lib/avatar';

/** Just the character drawing, no background. */
export function CharacterArt({ id, size }: { id: CharacterId; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {CHARACTER_BY_ID[id].art}
    </Svg>
  );
}

/** A player's avatar: a Call It crew member in a coloured circle, or an emoji. */
export function Avatar({ value, size = 32 }: { value: string | null | undefined; size?: number }) {
  const id = characterIdOf(value);
  if (!id) {
    return <Text style={{ fontSize: size * 0.78, lineHeight: size, width: size, textAlign: 'center' }}>{value ?? ''}</Text>;
  }
  const c = CHARACTER_BY_ID[id];
  return (
    <View
      accessibilityLabel={c.name}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg }]}
    >
      <CharacterArt id={id} size={size * 0.86} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

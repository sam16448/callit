import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CallTag } from '@/components/CallTag';
import { Button, Card, Screen, SectionLabel } from '@/components/ui';
import { AVATARS, NICKNAME_MAX, cleanNickname, nicknameError } from '@/lib/nickname';
import { takePendingInvite } from '@/lib/pendingInvite';
import { useProfile } from '@/state/profile';
import { C, F, R, S, T } from '@/theme';

export default function Onboarding() {
  const { create } = useProfile();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);
  const [touched, setTouched] = useState(false);
  const error = nicknameError(name);

  const start = () => {
    setTouched(true);
    if (error) return;
    create(cleanNickname(name), avatar);
    // Came from an invite link: go on to join that league.
    const invite = takePendingInvite();
    if (invite) router.replace({ pathname: '/join/[code]', params: { code: invite } });
    else router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen footer={<Button title="Let's play" icon="flash" onPress={start} disabled={touched && Boolean(error)} />}>
        <Text style={styles.brand}>CALL IT</Text>
        <Text style={styles.hero}>Know it?{'\n'}Call it.</Text>
        <Text style={styles.lede}>
          A daily trivia league. Before each answer you see the opening words and make your call. Skill decides rank. Money never does.
        </Text>

        <Card style={styles.howCard}>
          <View style={styles.howRow}>
            <CallTag call="safe" />
            <Text style={styles.howText}>Can&apos;t lose points</Text>
          </View>
          <View style={styles.howRow}>
            <CallTag call="sure" />
            <Text style={styles.howText}>Double, or −150</Text>
          </View>
          <View style={styles.howRow}>
            <CallTag call="allin" />
            <Text style={styles.howText}>Triple, or −300</Text>
          </View>
        </Card>

        <SectionLabel>Your nickname</SectionLabel>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={() => setTouched(true)}
          placeholder="e.g. quizwala"
          placeholderTextColor={C.faint}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={NICKNAME_MAX + 4}
          style={[styles.input, touched && error ? { borderColor: C.bad } : null]}
          returnKeyType="done"
          onSubmitEditing={start}
          accessibilityLabel="Nickname"
        />
        <Text style={[styles.hint, touched && error ? { color: C.bad } : null]}>
          {touched && error ? error : 'Shown on the boards. No password, no email.'}
        </Text>

        <SectionLabel>Pick your avatar</SectionLabel>
        <View style={styles.avatars}>
          {AVATARS.map((a) => (
            <Pressable
              key={a}
              accessibilityRole="radio"
              accessibilityState={{ selected: a === avatar }}
              accessibilityLabel={`Avatar ${a}`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setAvatar(a);
              }}
              style={[styles.avatar, a === avatar && styles.avatarOn]}
            >
              <Text style={styles.avatarText}>{a}</Text>
            </Pressable>
          ))}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: { ...T.label, color: C.accent, marginTop: S.lg, letterSpacing: 3 },
  hero: { ...T.hero, color: C.text, lineHeight: 52, marginTop: S.sm },
  lede: { ...T.body, color: C.muted, marginTop: S.md },
  howCard: { marginTop: S.xl, gap: S.md, paddingVertical: S.lg },
  howRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  howText: { color: C.text, fontFamily: F.medium, fontSize: 14 },
  input: {
    height: 54,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
    color: C.text,
    paddingHorizontal: S.lg,
    fontFamily: F.semibold,
    fontSize: 17,
  },
  hint: { ...T.small, color: C.muted, marginTop: S.sm },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  avatarText: { fontSize: 26 },
});

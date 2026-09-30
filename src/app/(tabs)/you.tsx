import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Avatar } from '@/components/Avatar';
import { Button, Card, PageHeader, Pill, Row, Screen, SectionLabel } from '@/components/ui';
import { AVATARS } from '@/lib/nickname';
import { useEntitlements } from '@/state/entitlements';
import { useProfile } from '@/state/profile';
import { C, F, S, T } from '@/theme';

export default function You() {
  const { profile, update, reset } = useProfile();
  const ent = useEntitlements();
  if (!profile) return null;
  const renews = ent.renews ? new Date(ent.renews).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <Screen tab>
      <PageHeader title="You" />
      <Card style={styles.me}>
        <Avatar value={profile.avatar} size={56} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
            <Text style={styles.name}>{profile.nickname}</Text>
            {ent.pro ? <Pill text="PRO" color={C.accentInk} filled={C.accent} /> : null}
          </View>
          <Text style={[T.small, { color: C.muted }]}>
            🔥 {profile.dayStreak} day streak · best {profile.bestDayStreak}
          </Text>
        </View>
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickScroll} contentContainerStyle={styles.pick}>
        {AVATARS.map((a) => (
          <Pressable
            key={a}
            accessibilityRole="radio"
            accessibilityState={{ selected: a === profile.avatar }}
            accessibilityLabel="Change character"
            onPress={() => update({ avatar: a })}
            style={[styles.pickItem, a === profile.avatar && styles.pickOn]}
          >
            <Avatar value={a} size={38} />
          </Pressable>
        ))}
      </ScrollView>

      <SectionLabel>Call It Pro</SectionLabel>
      <Card style={{ paddingVertical: S.sm }}>
        <Row
          leading={<Text style={{ fontSize: 20 }}>👑</Text>}
          title={ent.pro ? 'You’re Pro' : 'Get Call It Pro'}
          sub={
            ent.pro
              ? renews
                ? `Renews or ends ${renews}. Manage it in your store account.`
                : ent.mode === 'live'
                  ? 'Thanks for backing Call It.'
                  : 'Unlocked on this phone (preview mode).'
              : 'Unlimited practice, leagues, stats. Never extra Aura.'
          }
          onPress={() => router.push({ pathname: '/paywall', params: { reason: 'you' } })}
        />
        {ent.pro && ent.mode !== 'live' ? (
          <Row leading={<Text style={{ fontSize: 20 }}>↩️</Text>} title="Turn off preview Pro" sub="To try the paywall again" onPress={ent.resetPreview} />
        ) : null}
      </Card>

      <SectionLabel>Settings</SectionLabel>
      <Card style={{ paddingVertical: S.sm }}>
        <Row
          leading={<Text style={{ fontSize: 20 }}>🧘</Text>}
          title="Chill mode"
          sub="Only big moments, shown as a small banner"
          right={
            <Switch
              value={profile.chill}
              onValueChange={(v) => update({ chill: v })}
              trackColor={{ true: C.accent, false: C.line }}
              thumbColor={C.text}
              accessibilityLabel="Chill mode"
            />
          }
        />
        <Row leading={<Text style={{ fontSize: 20 }}>❓</Text>} title="How to play" onPress={() => router.push('/how-to-play')} />
      </Card>

      <SectionLabel>Credits</SectionLabel>
      <Card style={{ paddingVertical: S.sm }}>
        <Row leading={<Text style={{ fontSize: 20 }}>🗿</Text>} title="The Call It crew" sub="Original characters, drawn for Call It" />
        <Row leading={<Text style={{ fontSize: 20 }}>💻</Text>} title="Open source" sub="github.com/sam16448/callit · MIT" onPress={() => Linking.openURL('https://github.com/sam16448/callit')} />
      </Card>

      <View style={{ marginTop: S.xl }}>
        <Button
          title="Start over (clears this phone)"
          variant="ghost"
          onPress={() =>
            Alert.alert('Start over?', 'This deletes your nickname, runs, streak and league spots on this phone. It can’t be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Start over', style: 'destructive', onPress: reset },
            ])
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pickScroll: { marginHorizontal: -S.xl, marginTop: S.md },
  pick: { gap: S.sm, paddingHorizontal: S.xl },
  pickItem: { padding: 3, borderRadius: 999, borderWidth: 2, borderColor: 'transparent' },
  pickOn: { borderColor: C.accent },
  me: { flexDirection: 'row', alignItems: 'center', gap: S.lg },
  name: { color: C.text, fontFamily: F.display, fontSize: 24 },
});

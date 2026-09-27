import { Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, PageHeader, Pill, Row, Screen, SectionLabel } from '@/components/ui';
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
        <Text style={{ fontSize: 44 }}>{profile.avatar}</Text>
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
              : 'Unlimited practice, leagues, stats. Never extra points.'
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
        <Row
          leading={<Text style={{ fontSize: 20 }}>📖</Text>}
          title="Open Trivia DB"
          sub="Category questions from opentdb.com, CC BY-SA 4.0"
          onPress={() => Linking.openURL('https://opentdb.com')}
        />
        <Row leading={<Text style={{ fontSize: 20 }}>💻</Text>} title="Open source" sub="github.com/sam16448/callit · MIT" onPress={() => Linking.openURL('https://github.com/sam16448/callit')} />
      </Card>

      <View style={{ marginTop: S.xl }}>
        <Button title="Start over (clears this phone)" variant="ghost" onPress={reset} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  me: { flexDirection: 'row', alignItems: 'center', gap: S.lg },
  name: { color: C.text, fontFamily: F.display, fontSize: 24 },
});

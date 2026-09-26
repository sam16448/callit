import { Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, PageHeader, Row, Screen, SectionLabel } from '@/components/ui';
import { useProfile } from '@/state/profile';
import { C, F, S, T } from '@/theme';

export default function You() {
  const { profile, update, reset } = useProfile();
  if (!profile) return null;

  return (
    <Screen tab>
      <PageHeader title="You" />
      <Card style={styles.me}>
        <Text style={{ fontSize: 44 }}>{profile.avatar}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile.nickname}</Text>
          <Text style={[T.small, { color: C.muted }]}>
            🔥 {profile.dayStreak} day streak · best {profile.bestDayStreak}
          </Text>
        </View>
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

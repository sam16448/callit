import { Text } from 'react-native';
import { Card, PageHeader, Row, Screen, SectionLabel } from '@/components/ui';
import { C, S, T } from '@/theme';

/** Private leagues: placeholder until the Supabase backend and invite links land. */
export default function Leagues() {
  return (
    <Screen tab>
      <PageHeader title="Leagues" sub="Small boards for your friends" />
      <Card>
        <Text style={[T.h2, { color: C.text }]}>Play the same runs, rank with your crew</Text>
        <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>
          A league is a private board for a group. Everyone plays the normal daily runs, so there&apos;s nothing extra to grind. Joining is always free.
        </Text>
      </Card>
      <SectionLabel>Coming next</SectionLabel>
      <Card style={{ paddingVertical: S.sm }}>
        <Row leading={<Text style={{ fontSize: 20 }}>🔗</Text>} title="Join with a code" sub="Free for everyone, via callit://join/CODE links" disabled />
        <Row leading={<Text style={{ fontSize: 20 }}>👑</Text>} title="Create a league" sub="Part of Call It Pro" disabled />
      </Card>
    </Screen>
  );
}

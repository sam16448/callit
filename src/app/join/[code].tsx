import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BackBar, Button, Screen } from '@/components/ui';
import { isValidCode, normalizeCode } from '@/lib/league';
import { setPendingInvite } from '@/lib/pendingInvite';
import { api } from '@/services/api';
import { ONLINE } from '@/services/supabase';
import { useProfile } from '@/state/profile';
import { C, S, T } from '@/theme';

/** Opened by an invite link: callit://join/CODE */
export default function JoinScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const code = normalizeCode(String(raw ?? ''));
  const { profile } = useProfile();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!profile || !ONLINE || !isValidCode(code) || started.current) return;
    started.current = true;
    api
      .joinLeague(code)
      .then((l) => router.replace({ pathname: '/league/[id]', params: { id: l.id, name: l.name, code: l.code } }))
      .catch((e: Error) => setError(e.message));
  }, [profile, code]);

  // New player from an invite: nickname first, then straight back here.
  if (!profile) {
    setPendingInvite(isValidCode(code) ? code : null);
    return <Redirect href="/onboarding" />;
  }

  const problem = !ONLINE ? 'Leagues need the online version of the app.' : !isValidCode(code) ? 'That invite link looks broken.' : error;

  return (
    <Screen footer={problem ? <Button title="Go to Leagues" onPress={() => router.replace('/leagues')} /> : undefined}>
      <BackBar onBack={() => router.replace('/')} close />
      {problem ? (
        <>
          <Text style={[T.h1, { color: C.text }]}>Couldn&apos;t join</Text>
          <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>{problem}</Text>
        </>
      ) : (
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} />
          <Text style={[T.body, { color: C.muted, marginTop: S.md }]}>Joining league {code}…</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 80 },
});

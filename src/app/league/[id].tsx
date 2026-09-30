import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { Leaderboard } from '@/components/Leaderboard';
import { BackBar, Button, Card, Screen, tapLight } from '@/components/ui';
import { inviteText } from '@/lib/league';
import { api } from '@/services/api';
import { C, F, S, T } from '@/theme';

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/leagues');
}

export default function LeagueScreen() {
  const { id, name, code, fresh } = useLocalSearchParams<{ id: string; name?: string; code?: string; fresh?: string }>();
  const [copied, setCopied] = useState(false);
  const title = name ?? 'League';

  const share = async () => {
    tapLight();
    if (!code) return;
    try {
      await Share.share({ message: inviteText(title, code) });
    } catch {
      // share sheet closed
    }
  };

  const copy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const confirmLeave = () =>
    Alert.alert('Leave this league?', 'You can rejoin later with the code.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () =>
          api
            .leaveLeague(String(id))
            .then(leave)
            .catch(() => Alert.alert('Could not leave', 'Check your connection and try again.')),
      },
    ]);

  return (
    <Screen>
      <BackBar onBack={leave} title="League" right={<Ionicons name="exit-outline" size={22} color={C.muted} onPress={confirmLeave} accessibilityRole="button" accessibilityLabel="Leave league" hitSlop={12} />} />
      <Text style={[T.h1, { color: C.text }]}>{title}</Text>

      {code ? (
        <Card style={fresh ? [styles.invite, { borderColor: C.accent }] : styles.invite}>
          {fresh ? <Text style={styles.freshTitle}>League created 🎉 Invite your crew:</Text> : null}
          <View style={styles.codeRow}>
            <View style={{ flex: 1 }}>
              <Text style={[T.label, { color: C.muted }]}>Invite code</Text>
              <Text style={styles.code} onPress={copy} accessibilityRole="button" accessibilityLabel={`Code ${code}, tap to copy`}>
                {code}
              </Text>
              <Text style={styles.copied}>{copied ? 'Copied!' : 'Tap the code to copy'}</Text>
            </View>
          </View>
          <Button title="Share invite" icon="share-social-outline" onPress={share} />
        </Card>
      ) : null}

      <View style={{ marginTop: S.xl }}>
        <Leaderboard leagueId={String(id)} emptyHint="No one in this league has played this week yet. Play a run and share the invite." />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  invite: { marginTop: S.lg, gap: S.lg },
  freshTitle: { color: C.accent, fontFamily: F.bold, fontSize: 15 },
  codeRow: { flexDirection: 'row', alignItems: 'center' },
  code: { color: C.text, fontFamily: F.display, fontSize: 40, letterSpacing: 6, marginTop: 4 },
  copied: { color: C.faint, fontFamily: F.medium, fontSize: 12 },
});

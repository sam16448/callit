import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, PageHeader, Pill, Row, Screen, SectionLabel, tapLight } from '@/components/ui';
import { LEAGUE_NAME_MAX, codeFromText, leagueNameError, normalizeCode } from '@/lib/league';
import { api, type LeagueRow } from '@/services/api';
import { ONLINE } from '@/services/supabase';
import { useEntitlements } from '@/state/entitlements';
import { C, F, R, S, T } from '@/theme';

export default function Leagues() {
  return ONLINE ? <LiveLeagues /> : <OfflineLeagues />;
}

function openLeague(l: Pick<LeagueRow, 'id' | 'name' | 'code'>, fresh = false) {
  router.push({ pathname: '/league/[id]', params: { id: l.id, name: l.name, code: l.code, fresh: fresh ? '1' : undefined } });
}

function LiveLeagues() {
  const { pro } = useEntitlements();
  const [leagues, setLeagues] = useState<LeagueRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<'none' | 'join' | 'create'>('none');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      api
        .myLeagues()
        .then((r) => {
          if (!live) return;
          setLeagues(r);
          setLoadError(null);
        })
        .catch((e: Error) => live && setLoadError(e.message));
      return () => {
        live = false;
      };
    }, []),
  );

  const startCreate = () => {
    tapLight();
    if (!pro) {
      router.push({ pathname: '/paywall', params: { reason: 'create_league' } });
      return;
    }
    setFormError(null);
    setMode('create');
  };

  const paste = async () => {
    const text = await Clipboard.getStringAsync().catch(() => '');
    const found = codeFromText(text ?? '');
    if (found) setCode(found);
    else setFormError('No league code on the clipboard.');
  };

  const join = async () => {
    const c = codeFromText(code) ?? normalizeCode(code);
    if (c.length !== 6) return setFormError('Codes are 6 letters and numbers.');
    setBusy(true);
    setFormError(null);
    try {
      const l = await api.joinLeague(c);
      setMode('none');
      setCode('');
      openLeague(l);
    } catch (e) {
      setFormError(e instanceof Error ? e.message.replace(/^no league/i, 'No league') : 'Could not join.');
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    const err = leagueNameError(name);
    if (err) return setFormError(err);
    setBusy(true);
    setFormError(null);
    try {
      const l = await api.createLeague(name.trim());
      setMode('none');
      setName('');
      openLeague(l, true);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Could not create the league.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen tab>
        <PageHeader title="Leagues" sub="Small boards for your friends" />

        <View style={styles.actions}>
          <Pressable style={[styles.action, mode === 'join' && styles.actionOn]} onPress={() => (setFormError(null), setMode(mode === 'join' ? 'none' : 'join'))} accessibilityRole="button">
            <Ionicons name="enter-outline" size={22} color={C.accent} />
            <Text style={styles.actionTitle}>Join with code</Text>
            <Text style={styles.actionSub}>Always free</Text>
          </Pressable>
          <Pressable style={[styles.action, mode === 'create' && styles.actionOn]} onPress={startCreate} accessibilityRole="button">
            <Ionicons name="add-circle-outline" size={22} color={C.accent} />
            <Text style={styles.actionTitle}>Create a league</Text>
            {pro ? <Text style={styles.actionSub}>Pro</Text> : <Pill text="PRO" color={C.accentInk} filled={C.accent} />}
          </Pressable>
        </View>

        {mode === 'join' ? (
          <Card style={styles.form}>
            <Text style={styles.formLabel}>League code</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.length > 12 ? (codeFromText(t) ?? t) : t)}
                placeholder="e.g. H7KQ2M"
                placeholderTextColor={C.faint}
                autoCapitalize="characters"
                autoCorrect={false}
                style={[styles.input, { flex: 1, letterSpacing: 3 }]}
                onSubmitEditing={join}
                returnKeyType="go"
                accessibilityLabel="League code"
              />
              <Pressable onPress={paste} style={styles.pasteBtn} accessibilityRole="button" accessibilityLabel="Paste">
                <Ionicons name="clipboard-outline" size={20} color={C.text} />
              </Pressable>
            </View>
            {formError ? <Text style={styles.err}>{formError}</Text> : <Text style={styles.hint}>Paste the whole invite message if you like; we&apos;ll find the code.</Text>}
            <Button title="Join league" onPress={join} loading={busy} />
          </Card>
        ) : null}

        {mode === 'create' ? (
          <Card style={styles.form}>
            <Text style={styles.formLabel}>League name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Hostel B4"
              placeholderTextColor={C.faint}
              maxLength={LEAGUE_NAME_MAX}
              style={styles.input}
              onSubmitEditing={create}
              returnKeyType="done"
              accessibilityLabel="League name"
            />
            {formError ? <Text style={styles.err}>{formError}</Text> : <Text style={styles.hint}>You&apos;ll get a code and an invite link to share.</Text>}
            <Button title="Create league" onPress={create} loading={busy} />
          </Card>
        ) : null}

        <SectionLabel>Your leagues</SectionLabel>
        {loadError ? (
          <Text style={[T.body, { color: C.bad }]}>{loadError}</Text>
        ) : !leagues ? (
          <ActivityIndicator color={C.accent} />
        ) : leagues.length === 0 ? (
          <Card>
            <Text style={[T.h2, { color: C.text }]}>No leagues yet</Text>
            <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>
              Everyone plays the same daily runs, so a league is just a smaller board: you, your friends, and who called it best this week.
            </Text>
          </Card>
        ) : (
          <Card style={{ paddingVertical: S.sm }}>
            {leagues.map((l) => (
              <Row
                key={l.id}
                leading={<Text style={{ fontSize: 20 }}>{l.is_owner ? '👑' : '🏆'}</Text>}
                title={l.name}
                sub={`${Number(l.members)} ${Number(l.members) === 1 ? 'player' : 'players'} · code ${l.code}`}
                onPress={() => openLeague(l)}
              />
            ))}
          </Card>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function OfflineLeagues() {
  return (
    <Screen tab>
      <PageHeader title="Leagues" sub="Small boards for your friends" />
      <Card>
        <Text style={[T.h2, { color: C.text }]}>Leagues need the online version</Text>
        <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>
          This is the offline demo. With the online question bank connected (see docs/SETUP.md), you can join a friend&apos;s league for free, or create your own with Pro.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: S.sm },
  action: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    gap: 6,
    borderWidth: 1,
    borderColor: C.line,
  },
  actionOn: { borderColor: C.accent },
  actionTitle: { color: C.text, fontFamily: F.bold, fontSize: 15, marginTop: S.xs },
  actionSub: { color: C.muted, fontFamily: F.body, fontSize: 12.5 },
  form: { marginTop: S.md, gap: S.md },
  formLabel: { ...T.label, color: C.muted },
  inputRow: { flexDirection: 'row', gap: S.sm },
  input: {
    height: 52,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.bg,
    color: C.text,
    paddingHorizontal: S.lg,
    fontFamily: F.semibold,
    fontSize: 17,
  },
  pasteBtn: { width: 52, height: 52, borderRadius: R.md, backgroundColor: C.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  hint: { ...T.small, color: C.faint },
  err: { ...T.small, color: C.bad },
});

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BackBar, Button, Card, Screen } from '@/components/ui';
import { PAYWALL_COPY, PRO_PERKS, annualSaving, isPaywallReason, perMonth } from '@/lib/pro';
import { useEntitlements, type PlanOption } from '@/state/entitlements';
import { C, F, R, S, T } from '@/theme';

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function PlanCard({ plan, selected, saving, onPress }: { plan: PlanOption; selected: boolean; saving: number | null; onPress: () => void }) {
  const annual = plan.kind === 'annual';
  const monthly = annual ? perMonth(plan.price, plan.currencySymbol) : null;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.plan, selected && styles.planOn]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${annual ? 'Yearly' : 'Monthly'}, ${plan.priceString}`}
    >
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? C.accent : C.faint} />
      <View style={{ flex: 1 }}>
        <View style={styles.planHead}>
          <Text style={styles.planTitle}>{annual ? 'Yearly' : 'Monthly'}</Text>
          {annual && saving ? (
            <View style={styles.save}>
              <Text style={styles.saveText}>SAVE {saving}%</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.planSub}>{annual ? (monthly ? `Just ${monthly}` : 'Billed once a year') : 'Cancel any time'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.price}>{plan.priceString}</Text>
        <Text style={styles.per}>{annual ? 'per year' : 'per month'}</Text>
      </View>
    </Pressable>
  );
}

export default function Paywall() {
  const { reason: raw } = useLocalSearchParams<{ reason?: string }>();
  const reason = isPaywallReason(raw) ? raw : 'you';
  const copy = PAYWALL_COPY[reason];
  const ent = useEntitlements();
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  const annual = ent.plans.find((p) => p.kind === 'annual');
  const monthly = ent.plans.find((p) => p.kind === 'monthly');
  const selected = ent.plans.find((p) => p.id === selectedId) ?? annual ?? monthly;
  const saving = annual && monthly ? annualSaving(monthly.price, annual.price) : null;

  if (ent.pro) {
    return (
      <Screen footer={<Button title="Back to the game" onPress={close} />}>
        <BackBar onBack={close} close />
        <Text style={styles.proEmoji}>👑</Text>
        <Text style={[T.h1, { color: C.text }]}>You&apos;re Pro</Text>
        <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>Everything below is unlocked. Thanks for backing Call It.</Text>
        <Card style={{ marginTop: S.xl, gap: S.md }}>
          {PRO_PERKS.map((p) => (
            <Perk key={p.text} icon={p.icon} text={p.text} soon={p.soon} />
          ))}
        </Card>
      </Screen>
    );
  }

  const onBuy = async () => {
    if (!selected) return;
    setBusy('buy');
    const result = await ent.purchase(selected);
    setBusy(null);
    if (result === 'unlocked') close();
    else if (result === 'error') Alert.alert('Purchase not completed', 'Nothing was charged. Please try again.');
  };

  const onRestore = async () => {
    setBusy('restore');
    const r = await ent.restorePurchases();
    setBusy(null);
    if (r === 'restored') close();
    else
      Alert.alert(
        r === 'unavailable' ? 'Restore needs the installed app' : 'Nothing to restore',
        r === 'unavailable' ? 'Restoring works in the installed app with a store account.' : 'No active Call It Pro subscription was found for this account.',
      );
  };

  return (
    <Screen
      footer={
        <View style={{ gap: S.sm }}>
          <Button
            title={selected ? `Start Pro · ${selected.priceString}/${selected.kind === 'annual' ? 'yr' : 'mo'}` : 'Plans unavailable'}
            icon="flash"
            onPress={onBuy}
            loading={busy === 'buy'}
            disabled={!selected || busy !== null}
          />
          <Text style={styles.fine}>
            {ent.mode === 'live'
              ? 'Renews automatically until you cancel in your store account settings.'
              : 'Preview mode: no store here, so this unlocks Pro on this phone without charging anything.'}
          </Text>
        </View>
      }
    >
      <BackBar onBack={close} close />
      <Animated.View entering={FadeInDown.duration(350)}>
        <Text style={styles.kicker}>CALL IT PRO</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.sub}>{copy.sub}</Text>
      </Animated.View>

      <Card style={{ marginTop: S.xl, gap: S.md }}>
        {PRO_PERKS.map((p) => (
          <Perk key={p.text} icon={p.icon} text={p.text} soon={p.soon} />
        ))}
      </Card>

      <View style={styles.promise}>
        <Ionicons name="scale-outline" size={18} color={C.accent} />
        <Text style={styles.promiseText}>Never extra Aura. Ranked runs are free and identical for everyone.</Text>
      </View>

      <View style={{ gap: S.sm, marginTop: S.lg }}>
        {ent.plans.map((p) => (
          <PlanCard key={p.id} plan={p} selected={p.id === selected?.id} saving={saving} onPress={() => setSelectedId(p.id)} />
        ))}
        {ent.plans.length === 0 ? <Text style={[T.small, { color: C.muted }]}>Plans couldn&apos;t load. Check your connection and try again.</Text> : null}
      </View>

      <View style={styles.links}>
        <Pressable onPress={onRestore} disabled={busy !== null} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.link}>{busy === 'restore' ? 'Restoring…' : 'Restore purchases'}</Text>
        </Pressable>
        <Text style={styles.dot}>·</Text>
        <Pressable onPress={() => Linking.openURL('https://github.com/sam16448/callit/blob/main/docs/TERMS.md')} accessibilityRole="link" hitSlop={8}>
          <Text style={styles.link}>Terms & privacy</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function Perk({ icon, text, soon }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string; soon?: boolean }) {
  return (
    <View style={styles.perk}>
      <Ionicons name={icon} size={20} color={soon ? C.faint : C.accent} />
      <Text style={[styles.perkText, soon && { color: C.muted }]}>{text}</Text>
      {soon ? <Text style={styles.soon}>SOON</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { ...T.label, color: C.accent, letterSpacing: 2.5 },
  title: { ...T.h1, color: C.text, marginTop: S.sm },
  sub: { ...T.body, color: C.muted, marginTop: S.sm },
  proEmoji: { fontSize: 56, marginTop: S.lg, marginBottom: S.md },
  perk: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  perkText: { flex: 1, color: C.text, fontFamily: F.medium, fontSize: 14.5 },
  soon: { color: C.faint, fontFamily: F.bold, fontSize: 10, letterSpacing: 1, borderWidth: 1, borderColor: C.line, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  promise: { flexDirection: 'row', gap: S.sm, alignItems: 'center', marginTop: S.lg, paddingHorizontal: S.xs },
  promiseText: { flex: 1, color: C.muted, fontFamily: F.medium, fontSize: 13 },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  planOn: { borderColor: C.accent, backgroundColor: C.accentSoft },
  planHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  planTitle: { color: C.text, fontFamily: F.bold, fontSize: 16 },
  planSub: { color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: 2 },
  save: { backgroundColor: C.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  saveText: { color: C.accentInk, fontFamily: F.black, fontSize: 10, letterSpacing: 0.5 },
  price: { color: C.text, fontFamily: F.display, fontSize: 18 },
  per: { color: C.faint, fontFamily: F.medium, fontSize: 11.5 },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: S.sm, marginTop: S.xl },
  link: { color: C.muted, fontFamily: F.semibold, fontSize: 13 },
  dot: { color: C.faint },
  fine: { ...T.small, color: C.faint, textAlign: 'center', fontSize: 12 },
});

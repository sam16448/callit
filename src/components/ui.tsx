import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, F, R, S, T } from '@/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

export function tapLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Page shell: ink background with a violet glow at the top, scrollable body, optional sticky footer. */
export function Screen({
  children,
  footer,
  tab = false,
  scroll = true,
}: {
  children: ReactNode;
  footer?: ReactNode;
  /** Inside the tab bar: the tab bar already handles the bottom safe area. */
  tab?: boolean;
  scroll?: boolean;
}) {
  return (
    <View style={styles.root}>
      <LinearGradient colors={[C.bgGlow, C.bg]} start={{ x: 0.2, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.glow} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={tab ? ['top'] : ['top', 'bottom']}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.scroll, { flex: 1, paddingBottom: S.lg }]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  );
}

export function SectionLabel({ children, style, right }: { children: ReactNode; style?: ViewStyle; right?: ReactNode }) {
  return (
    <View style={[styles.sectionLabel, style]}>
      <Text style={[T.label, { color: C.muted }]}>{children}</Text>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  color,
  ink,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'subtle';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  /** Override the primary fill colour. */
  color?: string;
  ink?: string;
}) {
  const primary = variant === 'primary';
  const textColor = primary ? (ink ?? C.accentInk) : C.text;
  const inner = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <View style={styles.buttonRow}>
      {icon ? <Ionicons name={icon} size={19} color={textColor} style={{ marginRight: S.sm }} /> : null}
      <Text style={[styles.buttonText, { color: textColor }]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={() => {
        tapLight();
        onPress();
      }}
      style={({ pressed }) => [(disabled || loading) && { opacity: 0.45 }, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View
        style={[
          styles.buttonFill,
          primary && { backgroundColor: color ?? C.accent },
          variant === 'ghost' && styles.buttonGhost,
          variant === 'subtle' && styles.buttonSubtle,
        ]}
      >
        {inner}
      </View>
    </Pressable>
  );
}

export function Pill({ text, color = C.muted, icon, filled }: { text: string; color?: string; icon?: IconName; filled?: string }) {
  return (
    <View style={[styles.pill, { borderColor: filled ? 'transparent' : C.line, backgroundColor: filled }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}

/** Top bar with a back (or close) button, used instead of the native header. */
export function BackBar({ onBack, title, right, close }: { onBack: () => void; title?: string; right?: ReactNode; close?: boolean }) {
  return (
    <View style={styles.backBar}>
      <Pressable accessibilityRole="button" accessibilityLabel={close ? 'Close' : 'Back'} hitSlop={12} onPress={onBack} style={styles.backButton}>
        <Ionicons name={close ? 'close' : 'chevron-back'} size={22} color={C.text} />
      </Pressable>
      {title ? (
        <Text style={[T.label, { color: C.muted, flex: 1 }]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}

/** Large page title used at the top of each tab. */
export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <View style={styles.pageHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.pageTitle}>{title}</Text>
        {sub ? <Text style={styles.pageSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** A list row with a leading emoji or icon, title, subtitle and a chevron. */
export function Row({
  leading,
  title,
  sub,
  right,
  onPress,
  disabled,
}: {
  leading?: ReactNode;
  title: string;
  sub?: string;
  right?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const body = (
    <View style={[styles.row, disabled && { opacity: 0.5 }]}>
      {leading ? <View style={styles.rowLead}>{leading}</View> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={styles.rowSub} numberOfLines={2}>
            {sub}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress && !disabled ? <Ionicons name="chevron-forward" size={18} color={C.faint} /> : null)}
    </View>
  );
  if (!onPress || disabled) return body;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        tapLight();
        onPress();
      }}
      style={({ pressed }) => pressed && { opacity: 0.75 }}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: 56 },
  footer: {
    paddingHorizontal: S.xl,
    paddingTop: S.md,
    paddingBottom: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    backgroundColor: C.bg,
  },
  sectionLabel: { marginTop: S.xl, marginBottom: S.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: S.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  buttonFill: { height: 56, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xl },
  buttonGhost: { borderWidth: 1, borderColor: C.line, backgroundColor: 'transparent' },
  buttonSubtle: { backgroundColor: C.surfaceHi },
  buttonRow: { flexDirection: 'row', alignItems: 'center' },
  buttonText: { fontFamily: F.bold, fontSize: 16.5 },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  pillText: { fontSize: 12, fontFamily: F.semibold, letterSpacing: 0.2 },
  backBar: { flexDirection: 'row', alignItems: 'center', marginBottom: S.lg, gap: S.md },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.sm, marginBottom: S.lg },
  pageTitle: { ...T.h1, color: C.text, fontSize: 32, lineHeight: 38 },
  pageSub: { ...T.body, color: C.muted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  rowLead: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: C.text, fontFamily: F.semibold, fontSize: 15.5 },
  rowSub: { color: C.muted, fontFamily: F.body, fontSize: 13, marginTop: 2, lineHeight: 18 },
});

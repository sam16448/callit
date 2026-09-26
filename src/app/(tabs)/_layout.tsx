import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfile } from '@/state/profile';
import { C, F } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(active: IconName, idle: IconName) {
  function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    return <Ionicons name={focused ? active : idle} size={23} color={color as string} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const { profile } = useProfile();
  const insets = useSafeAreaInsets();

  // No nickname yet: onboarding first.
  if (!profile) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: [styles.bar, { height: 62 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 6 }],
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Play', tabBarIcon: icon('flash', 'flash-outline') }} />
      <Tabs.Screen name="board" options={{ title: 'Board', tabBarIcon: icon('podium', 'podium-outline') }} />
      <Tabs.Screen name="leagues" options={{ title: 'Leagues', tabBarIcon: icon('people', 'people-outline') }} />
      <Tabs.Screen name="you" options={{ title: 'You', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#0E0C19', borderTopColor: C.line, borderTopWidth: StyleSheet.hairlineWidth },
  label: { fontFamily: F.semibold, fontSize: 11 },
});

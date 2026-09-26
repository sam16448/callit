import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut, ZoomIn } from 'react-native-reanimated';
import { DEFAULT_CAPTIONS, type MomentId } from '@/game/moments';
import { C, F, R, S } from '@/theme';

const TINT: Partial<Record<MomentId, string>> = {
  allin_hit: '#FF3D7F',
  allin_miss: '#7C6CFF',
  clutch: '#FFC940',
  perfect_run: '#C8FF2E',
  new_number_one: '#FFC940',
};

/**
 * Full-screen reaction for one moment. Tap anywhere to skip; it also leaves on
 * its own. In chill mode it is a small banner instead. Placeholder visuals:
 * the Skia/Lottie effects and CC0 sounds replace the inside later.
 */
export function MomentOverlay({ id, chill, onDone }: { id: MomentId; chill: boolean; onDone: () => void }) {
  const cap = DEFAULT_CAPTIONS[id];
  const tint = TINT[id] ?? C.accent;
  const big = cap.tier === 'big' && !chill;

  useEffect(() => {
    if (!chill) {
      const type = id === 'allin_miss' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success;
      Haptics.notificationAsync(type).catch(() => {});
    }
    const t = setTimeout(onDone, big ? 2_200 : 1_500);
    return () => clearTimeout(t);
  }, [id, chill, big, onDone]);

  if (!big) {
    return (
      <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOut.duration(160)} style={styles.bannerWrap} pointerEvents="box-none">
        <Pressable onPress={onDone} style={[styles.banner, { borderColor: tint }]} accessibilityRole="button" accessibilityLabel={`${cap.title}. Tap to dismiss`}>
          <Text style={styles.bannerEmoji}>{cap.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: tint }]}>{cap.title}</Text>
            <Text style={styles.bannerSub}>{cap.sub}</Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(200)} style={styles.full}>
      <Pressable style={styles.fill} onPress={onDone} accessibilityRole="button" accessibilityLabel={`${cap.title}. Tap to skip`}>
        <Animated.View entering={ZoomIn.springify().damping(11)} style={styles.center}>
          <View style={[styles.ring, { borderColor: tint, shadowColor: tint }]}>
            <Text style={styles.emoji}>{cap.emoji}</Text>
          </View>
          <Text style={[styles.title, { color: tint }]}>{cap.title}</Text>
          <Text style={styles.sub}>{cap.sub}</Text>
          <Text style={styles.skip}>tap to skip</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  full: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.scrim, zIndex: 20 },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xl },
  center: { alignItems: 'center' },
  ring: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    backgroundColor: C.surface,
  },
  emoji: { fontSize: 72 },
  title: { fontFamily: F.display, fontSize: 52, letterSpacing: -1, marginTop: S.xl, textAlign: 'center' },
  sub: { color: C.text, fontFamily: F.semibold, fontSize: 17, marginTop: S.sm, textAlign: 'center' },
  skip: { color: C.faint, fontFamily: F.medium, fontSize: 12, marginTop: S.xxl },
  bannerWrap: { position: 'absolute', left: S.xl, right: S.xl, top: S.md, zIndex: 20 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.surfaceHi, borderRadius: R.md, borderWidth: 1, padding: S.md },
  bannerEmoji: { fontSize: 26 },
  bannerTitle: { fontFamily: F.display, fontSize: 18 },
  bannerSub: { color: C.muted, fontFamily: F.body, fontSize: 13 },
});

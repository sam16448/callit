import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { CallPicker } from '@/components/CallPicker';
import { CallTag } from '@/components/CallTag';
import { MomentOverlay } from '@/components/MomentOverlay';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { TimerBar } from '@/components/TimerBar';
import { BackBar, Button, Card, Pill, Screen, tapLight } from '@/components/ui';
import { BOARDS, boardById } from '@/game/boards';
import type { MomentId } from '@/game/moments';
import { canPractice, practiceLabel, scorePractice } from '@/game/practice';
import { runReducer, startRun, type RunAction, type RunState } from '@/game/run';
import { QUESTION_MS, clampMsLeft } from '@/game/scoring';
import { utcDay } from '@/game/time';
import type { BoardId, Call, Question } from '@/game/types';
import { formatPoints } from '@/lib/format';
import { ApiError } from '@/services/api';
import { nextPracticeQuestion, practiceServedToday } from '@/services/practice';
import { useEntitlements } from '@/state/entitlements';
import { useProfile } from '@/state/profile';
import { CALL_COLOR, C, F, R, S, T } from '@/theme';

/** Practice never ends on its own; this is just "more than anyone will play in one go". */
const ENDLESS = 10_000;

function nowMs() {
  return Date.now();
}

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function toPaywall() {
  router.replace({ pathname: '/paywall', params: { reason: 'practice_limit' } });
}

export default function Practice() {
  const params = useLocalSearchParams<{ board?: string }>();
  const initial = boardById(String(params.board ?? 'mixed'))?.id ?? 'mixed';
  const { pro } = useEntitlements();
  const { profile } = useProfile();
  const [day] = useState(() => utcDay());
  const [board, setBoard] = useState<BoardId>(initial);
  const [started, setStarted] = useState(false);
  const [served, setServed] = useState<number | null>(null);
  const [run, setRun] = useState<RunState>(() => startRun(ENDLESS, { chill: profile?.chill }));
  const [current, setCurrent] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msLeft, setMsLeft] = useState(QUESTION_MS);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const lastId = useRef<string | undefined>(undefined);

  const dispatch = useCallback((a: RunAction) => setRun((s) => runReducer(s, a)), []);

  useEffect(() => {
    practiceServedToday(day)
      .then(setServed)
      .catch(() => setServed(0));
  }, [day]);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await nextPracticeQuestion(board, day, lastId.current);
      lastId.current = next.question.id;
      setServed(next.servedToday);
      setCurrent(next.question);
      dispatch({ type: 'TEASER', teaser: { teaser: next.teaser, category: next.question.category } });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'practice_limit') return toPaywall();
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }, [board, day, dispatch]);

  const begin = () => {
    if (served !== null && !canPractice(served, pro)) return toPaywall();
    setStarted(true);
    load();
  };

  const place = (call: Call) => {
    if (!current) return;
    setMsLeft(QUESTION_MS);
    dispatch({ type: 'CALLED', call, revealed: { prompt: current.prompt, options: current.options }, shownAt: nowMs() });
  };

  const answer = useCallback(
    (choice: number | null) => {
      setRun((s) => {
        if (s.phase !== 'question' || !current || !s.call || s.shownAt === null) return s;
        const outcome = { ...scorePractice(current, s.call, s.shownAt, choice, nowMs(), s.total), questionId: current.id };
        return runReducer(s, { type: 'ANSWERED', outcome });
      });
    },
    [current],
  );

  // The clock: time left from timestamps, the interval only redraws.
  const phase = run.phase;
  const shownAt = run.shownAt;
  useEffect(() => {
    if (phase !== 'question' || shownAt === null) return;
    let sent = false;
    const tick = () => {
      const left = clampMsLeft(QUESTION_MS - (nowMs() - shownAt));
      setMsLeft(left);
      if (left <= 0 && !sent) {
        sent = true;
        answer(null);
      }
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [phase, shownAt, answer]);

  const next = () => {
    if (served !== null && !canPractice(served, pro)) return toPaywall();
    dispatch({ type: 'NEXT' });
    setCurrent(null);
    load();
  };

  const momentKey = `${run.answers.length}-${run.phase}`;
  const moment: MomentId | null = dismissed !== momentKey ? run.spotlight : null;
  const clearMoment = useCallback(() => setDismissed(momentKey), [momentKey]);

  const counter = served === null ? '' : practiceLabel(served, pro);
  const header = (
    <BackBar
      onBack={leave}
      close
      title={started ? `Practice · ${boardById(board)?.name ?? ''}` : 'Practice'}
      right={started ? <Pill text={`${formatPoints(run.total)} Aura`} color={C.text} filled={C.surfaceHi} /> : undefined}
    />
  );

  let body: React.ReactNode;
  let footer: React.ReactNode = null;

  if (!started) {
    body = (
      <Animated.View entering={FadeIn.duration(250)}>
        <Text style={styles.title}>Practice</Text>
        <Text style={styles.sub}>Same calls, same clock, same scoring. Nothing here counts for the boards, and practice questions never appear in ranked runs.</Text>
        <Text style={[T.label, { color: C.muted, marginTop: S.xl, marginBottom: S.md }]}>Pick a topic</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
          {BOARDS.map((b) => {
            const on = b.id === board;
            return (
              <Pressable
                key={b.id}
                onPress={() => {
                  tapLight();
                  setBoard(b.id);
                }}
                style={[styles.chip, on && styles.chipOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, on && { color: C.accentInk }]}>
                  {b.emoji} {b.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Card style={styles.limit}>
          <Ionicons name={pro ? 'infinite' : 'hourglass-outline'} size={20} color={C.accent} />
          <Text style={styles.limitText}>{served === null ? 'Checking today’s practice…' : counter}</Text>
        </Card>
      </Animated.View>
    );
    footer = <Button title="Start practising" icon="barbell-outline" onPress={begin} disabled={served === null} />;
  } else if (error) {
    body = (
      <Card style={styles.errorCard}>
        <Ionicons name="cloud-offline-outline" size={20} color={C.bad} />
        <Text style={styles.errorText}>{error}</Text>
      </Card>
    );
    footer = <Button title="Try again" icon="refresh" onPress={load} />;
  } else if (run.phase === 'call') {
    body =
      run.teaser && !busy ? (
        <Animated.View key={`p-${run.answers.length}`} entering={FadeInDown.duration(240)}>
          <Text style={styles.counter}>{counter}</Text>
          <Text style={[T.label, { color: C.muted, marginTop: S.lg }]}>{label(run.teaser.category)}</Text>
          <Card style={styles.teaserCard}>
            <Text style={styles.teaser}>“{run.teaser.teaser}”</Text>
          </Card>
          <Text style={styles.callPrompt}>Make your call</Text>
          <CallPicker onCall={place} />
        </Animated.View>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={C.accent} />
        </View>
      );
  } else if (run.call && run.revealed && run.teaser && (run.phase === 'question' || run.phase === 'result')) {
    const last = run.phase === 'result' ? run.answers[run.answers.length - 1] : undefined;
    const optionState = (i: number): OptionState => {
      if (!last || !current) return 'idle';
      if (i === current.answerIndex) return 'correct';
      if (i === last.choice) return 'wrong';
      return 'dim';
    };
    body = (
      <View>
        {run.phase === 'question' ? (
          <TimerBar msLeft={msLeft} running color={CALL_COLOR[run.call].main} />
        ) : last ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.resultRow}>
            <Text style={[styles.resultWord, { color: last.correct ? C.good : C.bad }]}>{last.correct ? 'Right' : last.choice === null ? "Time's up" : 'Wrong'}</Text>
            <Text style={[styles.resultWord, { color: last.points > 0 ? C.good : last.points < 0 ? C.bad : C.muted }]}>{formatPoints(last.points, { sign: true })}</Text>
          </Animated.View>
        ) : null}
        <View style={styles.qMeta}>
          <CallTag call={run.call} size="md" />
          <Text style={[T.label, { color: C.faint }]}>{label(run.teaser.category)}</Text>
        </View>
        <Text style={styles.prompt}>{run.revealed.prompt}</Text>
        <View style={{ gap: S.sm, marginTop: S.xl }}>
          {run.revealed.options.map((opt, i) => (
            <OptionButton key={i} index={i} text={opt} state={optionState(i)} disabled={run.phase !== 'question'} onPress={() => answer(i)} />
          ))}
        </View>
      </View>
    );
    if (run.phase === 'result') {
      const more = served === null || canPractice(served, pro);
      footer = <Button title={more ? 'Next question' : 'Keep practising with Pro'} icon={more ? 'arrow-forward' : 'flash'} onPress={next} />;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen footer={footer}>
        {header}
        {body}
      </Screen>
      {moment ? <MomentOverlay key={`${moment}-${momentKey}`} id={moment} chill={Boolean(profile?.chill)} onDone={clearMoment} /> : null}
    </View>
  );
}

function label(category: string): string {
  const b = boardById(category);
  return b ? `${b.emoji}  ${b.name}` : category;
}

const styles = StyleSheet.create({
  title: { ...T.h1, color: C.text, marginTop: S.md },
  sub: { ...T.body, color: C.muted, marginTop: S.sm },
  chipScroll: { marginHorizontal: -S.xl },
  chips: { gap: S.sm, paddingHorizontal: S.xl },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  chipOn: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.text, fontFamily: F.semibold, fontSize: 13.5 },
  limit: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.xl, padding: S.lg },
  limitText: { flex: 1, color: C.text, fontFamily: F.semibold, fontSize: 14.5 },
  counter: { ...T.small, color: C.muted },
  loading: { paddingVertical: 80, alignItems: 'center' },
  teaserCard: { marginTop: S.md, paddingVertical: S.xxl },
  teaser: { fontFamily: F.display, color: C.text, fontSize: 28, lineHeight: 36 },
  callPrompt: { ...T.label, color: C.accent, marginTop: S.xl, marginBottom: S.md },
  qMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.xl },
  prompt: { fontFamily: F.display, color: C.text, fontSize: 25, lineHeight: 32, marginTop: S.md },
  resultRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  resultWord: { fontFamily: F.display, fontSize: 32 },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, borderColor: C.bad, borderRadius: R.lg },
  errorText: { flex: 1, color: C.text, fontFamily: F.medium, fontSize: 14 },
});

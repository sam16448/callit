import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { BackHandler, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { CallPicker } from '@/components/CallPicker';
import { CallTag } from '@/components/CallTag';
import { MomentOverlay } from '@/components/MomentOverlay';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { RunSummary } from '@/components/RunSummary';
import { TimerBar } from '@/components/TimerBar';
import { BackBar, Button, Card, Pill, Screen } from '@/components/ui';
import { boardById, type Board } from '@/game/boards';
import type { MomentId } from '@/game/moments';
import { currentQuestion, runReducer, startRun } from '@/game/run';
import { QUESTION_MS, clampMsLeft } from '@/game/scoring';
import { teaserFor } from '@/game/teaser';
import { nextDayStreak, utcDay } from '@/game/time';
import type { Call, Question } from '@/game/types';
import { formatPoints } from '@/lib/format';
import { recordFromRun, shareText } from '@/lib/share';
import { isBoardPlayable, loadDailyRun } from '@/services/questions';
import { useProfile } from '@/state/profile';
import { useRuns, type RunRecord } from '@/state/runs';
import { CALL_COLOR, C, F, R, S, T } from '@/theme';

/** Wall clock, kept outside components so render stays pure. */
function nowMs() {
  return Date.now();
}

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

async function shareRun(record: RunRecord, boardName: string) {
  try {
    await Share.share({ message: shareText(record, boardName) });
  } catch {
    // Share sheet closed or not available (e.g. some browsers).
  }
}

export default function RunScreen() {
  const params = useLocalSearchParams<{ board: string }>();
  const board = boardById(String(params.board ?? ''));
  if (!board || !isBoardPlayable(board.id)) {
    return (
      <Screen>
        <BackBar onBack={leave} close />
        <Text style={[T.h1, { color: C.text }]}>Not open yet</Text>
        <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>This board&apos;s questions aren&apos;t loaded yet. Try the Mixed run for now.</Text>
      </Screen>
    );
  }
  return <Run board={board} />;
}

function Run({ board }: { board: Board }) {
  const { profile, recordPlay } = useProfile();
  const { get, save } = useRuns();
  const [day] = useState(() => utcDay());
  const questions = useMemo(() => loadDailyRun(board.id, day), [board.id, day]);
  // What was saved when the screen opened: one attempt per board per day.
  const [savedAtOpen] = useState(() => get(day, board.id));

  if (savedAtOpen) return <Recap board={board} questions={questions} saved={savedAtOpen} onSave={save} onFinish={recordPlay} />;
  return (
    <LiveRun
      board={board}
      day={day}
      questions={questions}
      chill={Boolean(profile?.chill)}
      nextStreak={profile && profile.lastPlayedDay !== day ? nextDayStreak(profile.lastPlayedDay, profile.dayStreak, day) : undefined}
      onSave={save}
      onFinish={recordPlay}
    />
  );
}

/** Reopening a run you already played: show the recap, never a second attempt. */
function Recap({
  board,
  questions,
  saved,
  onSave,
  onFinish,
}: {
  board: Board;
  questions: Question[];
  saved: RunRecord;
  onSave: (r: RunRecord) => void;
  onFinish: (day: string) => number;
}) {
  // A run left half-way (app closed) still counts: close it out once.
  const closed = useRef(false);
  useEffect(() => {
    if (saved.status !== 'in_progress' || closed.current) return;
    closed.current = true;
    onSave({ ...saved, status: 'done', updatedAt: new Date().toISOString() });
    onFinish(saved.day);
  }, [saved, onSave, onFinish]);

  return (
    <Screen
      footer={
        <View style={styles.footerRow}>
          <View style={{ flex: 1 }}>
            <Button title="Share" icon="share-outline" variant="subtle" onPress={() => shareRun(saved, board.name)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Done" onPress={leave} />
          </View>
        </View>
      }
    >
      <BackBar onBack={leave} close title={`${board.name} · today`} />
      <Text style={styles.already}>You&apos;ve played today&apos;s {board.name} run. New runs every day at 00:00 UTC (5:30 AM IST).</Text>
      <RunSummary record={saved} questions={questions} boardName={board.name} />
    </Screen>
  );
}

function LiveRun({
  board,
  day,
  questions,
  chill,
  nextStreak,
  onSave,
  onFinish,
}: {
  board: Board;
  day: string;
  questions: Question[];
  chill: boolean;
  nextStreak: number | undefined;
  onSave: (r: RunRecord) => void;
  onFinish: (day: string) => number;
}) {
  const [started, setStarted] = useState(false);
  const [state, dispatch] = useReducer(runReducer, undefined, () => startRun(questions, { chill }));
  const [msLeft, setMsLeft] = useState(QUESTION_MS);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const finished = useRef(false);
  const q = currentQuestion(state);
  const inRun = started && state.phase !== 'summary';

  // Save after every step, so closing the app mid-run still uses up the attempt.
  useEffect(() => {
    if (!started) return;
    const done = state.phase === 'summary';
    onSave(recordFromRun(state, day, board.id, done ? 'done' : 'in_progress'));
    if (done && !finished.current) {
      finished.current = true;
      onFinish(day);
    }
  }, [started, state, day, board.id, onSave, onFinish]);

  // One moment per question (and one for the end of the run), until tapped away.
  const momentKey = `${state.answers.length}-${state.phase}`;
  const moment: MomentId | null = dismissed === momentKey ? null : state.spotlight;

  // The clock. Time left comes from timestamps, the interval only redraws.
  useEffect(() => {
    if (state.phase !== 'question' || state.shownAt === null) return;
    const shownAt = state.shownAt;
    const tick = () => {
      const now = Date.now();
      const left = clampMsLeft(QUESTION_MS - (now - shownAt));
      setMsLeft(left);
      if (left <= 0) dispatch({ type: 'TIMEOUT', now });
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [state.phase, state.shownAt]);

  // Android back button: ask before ending a run.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!inRun) return false;
      setConfirmQuit(true);
      return true;
    });
    return () => sub.remove();
  }, [inRun]);

  const onClose = () => (inRun ? setConfirmQuit(true) : leave());
  const place = (call: Call) => {
    setMsLeft(QUESTION_MS);
    dispatch({ type: 'PLACE_CALL', call, now: nowMs() });
  };
  const answer = (choice: number) => dispatch({ type: 'ANSWER', choice, now: nowMs() });
  const next = () => dispatch({ type: 'NEXT', dayStreak: nextStreak });
  const clearMoment = useCallback(() => setDismissed(momentKey), [momentKey]);

  const progress = `${Math.min(state.index + 1, questions.length)}/${questions.length}`;
  const header = (
    <BackBar
      onBack={onClose}
      close
      title={started && state.phase !== 'summary' ? `${board.name} · ${progress}` : board.name}
      right={started ? <Pill text={`${formatPoints(state.total)} pts`} color={C.text} filled={C.surfaceHi} /> : undefined}
    />
  );

  let body: React.ReactNode;
  let footer: React.ReactNode = null;

  if (!started) {
    body = (
      <Animated.View entering={FadeIn.duration(250)}>
        <Text style={styles.introEmoji}>{board.emoji}</Text>
        <Text style={styles.introTitle}>{board.id === 'mixed' ? "Today's Mixed run" : `Today's ${board.name} run`}</Text>
        <Text style={styles.introSub}>
          {questions.length} questions · 15 seconds each · one attempt{board.id === 'mixed' ? ' · global board' : ' · weekly board'}
        </Text>
        <Card style={{ marginTop: S.xl, gap: S.lg }}>
          <Rule icon="eye-outline" text="You see the opening words of each question first." />
          <Rule icon="flash-outline" text="Then call it: Safe 1×, Sure 2× or All-in 3×. Wrong calls cost points." />
          <Rule icon="timer-outline" text="The options appear and the 15-second clock starts. Faster = up to +50 bonus." />
          <Rule icon="lock-closed-outline" text="Once you start, this is your one attempt for today." />
        </Card>
      </Animated.View>
    );
    footer = <Button title="Start run" icon="play" onPress={() => setStarted(true)} />;
  } else if (state.phase === 'summary') {
    const record = recordFromRun(state, day, board.id, 'done');
    body = <RunSummary record={record} questions={questions} boardName={board.name} />;
    footer = (
      <View style={styles.footerRow}>
        <View style={{ flex: 1 }}>
          <Button title="Share" icon="share-outline" variant="subtle" onPress={() => shareRun(record, board.name)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Done" onPress={leave} />
        </View>
      </View>
    );
  } else if (q && state.phase === 'call') {
    body = (
      <Animated.View key={`call-${state.index}`} entering={FadeInDown.duration(260)}>
        <Dots total={questions.length} index={state.index} answers={state.answers.map((a) => a.correct)} />
        <Text style={[T.label, { color: C.muted, marginTop: S.xl }]}>{categoryLabel(q)}</Text>
        <Card style={styles.teaserCard}>
          <Text style={styles.teaser}>“{teaserFor(q)}”</Text>
        </Card>
        <Text style={styles.callPrompt}>Make your call</Text>
        <CallPicker onCall={place} />
      </Animated.View>
    );
  } else if (q && state.call && (state.phase === 'question' || state.phase === 'result')) {
    const last = state.phase === 'result' ? state.answers[state.answers.length - 1] : undefined;
    const optionState = (i: number): OptionState => {
      if (!last) return 'idle';
      if (i === q.answerIndex) return 'correct';
      if (i === last.choice) return 'wrong';
      return 'dim';
    };
    body = (
      <View>
        {state.phase === 'question' ? (
          <TimerBar msLeft={msLeft} running color={CALL_COLOR[state.call].main} />
        ) : last ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.resultRow}>
            <Text style={[styles.resultWord, { color: last.correct ? C.good : C.bad }]}>
              {last.correct ? 'Right' : last.choice === null ? "Time's up" : 'Wrong'}
            </Text>
            <Text style={[styles.resultPts, { color: last.points > 0 ? C.good : last.points < 0 ? C.bad : C.muted }]}>
              {formatPoints(last.points, { sign: true })}
            </Text>
          </Animated.View>
        ) : null}
        <View style={styles.qMeta}>
          <CallTag call={state.call} size="md" />
          <Text style={[T.label, { color: C.faint }]}>{categoryLabel(q)}</Text>
        </View>
        <Text style={styles.prompt}>{q.prompt}</Text>
        <View style={{ gap: S.sm, marginTop: S.xl }}>
          {q.options.map((opt, i) => (
            <OptionButton key={i} index={i} text={opt} state={optionState(i)} disabled={state.phase !== 'question'} onPress={() => answer(i)} />
          ))}
        </View>
      </View>
    );
    if (state.phase === 'result') {
      const lastQ = state.index === questions.length - 1;
      footer = <Button title={lastQ ? 'See results' : 'Next question'} icon={lastQ ? 'trophy-outline' : 'arrow-forward'} onPress={next} />;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen footer={footer}>
        {header}
        {body}
      </Screen>
      {moment ? <MomentOverlay key={`${moment}-${momentKey}`} id={moment} chill={chill} onDone={clearMoment} /> : null}
      {confirmQuit ? (
        <View style={styles.scrim}>
          <Card style={styles.confirm}>
            <Text style={[T.h2, { color: C.text }]}>End this run?</Text>
            <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>
              It still counts as today&apos;s attempt. Questions you haven&apos;t answered score 0. The clock keeps running while you decide.
            </Text>
            <View style={[styles.footerRow, { marginTop: S.xl }]}>
              <View style={{ flex: 1 }}>
                <Button title="Keep playing" variant="subtle" onPress={() => setConfirmQuit(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="End run"
                  color={C.bad}
                  ink="#2A0008"
                  onPress={() => {
                    setConfirmQuit(false);
                    dispatch({ type: 'QUIT' });
                  }}
                />
              </View>
            </View>
          </Card>
        </View>
      ) : null}
    </View>
  );
}

function categoryLabel(q: Question): string {
  const b = boardById(q.category);
  return b ? `${b.emoji}  ${b.name}` : q.category;
}

function Rule({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.rule}>
      <Ionicons name={icon} size={20} color={C.accent} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

/** Progress dots: green right, red wrong, outlined current. */
function Dots({ total, index, answers }: { total: number; index: number; answers: boolean[] }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Question ${index + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < answers.length && { backgroundColor: answers[i] ? C.good : C.bad, borderColor: 'transparent' },
            i === index && { borderColor: C.accent, width: 22 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', gap: S.md },
  already: { ...T.small, color: C.muted, textAlign: 'center' },
  introEmoji: { fontSize: 56, marginTop: S.lg },
  introTitle: { ...T.h1, color: C.text, marginTop: S.md },
  introSub: { ...T.body, color: C.muted, marginTop: S.xs },
  rule: { flexDirection: 'row', gap: S.md, alignItems: 'flex-start' },
  ruleText: { flex: 1, color: C.text, fontFamily: F.medium, fontSize: 14.5, lineHeight: 20 },
  dots: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: C.line },
  teaserCard: { marginTop: S.md, paddingVertical: S.xxl, borderColor: C.line },
  teaser: { fontFamily: F.display, color: C.text, fontSize: 28, lineHeight: 36 },
  callPrompt: { ...T.label, color: C.accent, marginTop: S.xl, marginBottom: S.md },
  qMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.xl },
  prompt: { fontFamily: F.display, color: C.text, fontSize: 25, lineHeight: 32, marginTop: S.md },
  resultRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  resultWord: { fontFamily: F.display, fontSize: 32 },
  resultPts: { fontFamily: F.display, fontSize: 32 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.scrim, justifyContent: 'center', padding: S.xl, zIndex: 30 },
  confirm: { borderRadius: R.xl },
});

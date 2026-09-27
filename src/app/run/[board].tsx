import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { CallPicker, LOCKIN_GOLD } from '@/components/CallPicker';
import { CallTag } from '@/components/CallTag';
import { MomentOverlay } from '@/components/MomentOverlay';
import { OptionButton, type OptionState } from '@/components/OptionButton';
import { RunSummary } from '@/components/RunSummary';
import { TimerBar } from '@/components/TimerBar';
import { BackBar, Button, Card, Pill, Screen } from '@/components/ui';
import { boardById, type Board } from '@/game/boards';
import type { RunDriver } from '@/game/driver';
import type { MomentId } from '@/game/moments';
import { runReducer, startRun, type RunAction, type RunState } from '@/game/run';
import { QUESTION_MS, clampMsLeft } from '@/game/scoring';
import { nextDayStreak, utcDay, weekStart } from '@/game/time';
import type { Call } from '@/game/types';
import { formatPoints } from '@/lib/format';
import { recordFromRecap, recordFromRun } from '@/lib/share';
import { ApiError } from '@/services/api';
import { createDriver, isBoardPlayable, plannedRunLength } from '@/services/questions';
import { shareRun } from '@/services/shareCard';
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

function messageOf(e: unknown): string {
  return e instanceof ApiError || e instanceof Error ? e.message : 'Something went wrong.';
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
  const { get, save, runs } = useRuns();
  const [day] = useState(() => utcDay());
  // Offline, Lock-In stakes this week's earlier runs on the board too (online the server knows).
  const [priorWeek] = useState(() =>
    Object.values(runs)
      .filter((r) => r.board === board.id && r.day >= weekStart() && r.day < day)
      .reduce((sum, r) => sum + r.total, 0),
  );
  const driver = useMemo(() => createDriver(board.id, day, priorWeek), [board.id, day, priorWeek]);
  // What was saved when the screen opened: one attempt per board per day.
  const [savedAtOpen] = useState(() => get(day, board.id));
  const [finished, setFinished] = useState<RunRecord | null>(null);

  const recap = finished ?? (savedAtOpen && (savedAtOpen.status === 'done' || driver.mode === 'offline') ? savedAtOpen : null);
  if (recap) return <Recap board={board} saved={recap} onSave={save} onFinish={recordPlay} />;

  return (
    <LiveRun
      board={board}
      day={day}
      driver={driver}
      chill={Boolean(profile?.chill)}
      nextStreak={profile && profile.lastPlayedDay !== day ? nextDayStreak(profile.lastPlayedDay, profile.dayStreak, day) : undefined}
      onSave={save}
      onFinish={recordPlay}
      onAlreadyFinished={setFinished}
    />
  );
}

/** Reopening a run you already played: show the recap, never a second attempt. */
function Recap({
  board,
  saved,
  onSave,
  onFinish,
}: {
  board: Board;
  saved: RunRecord;
  onSave: (r: RunRecord) => void;
  onFinish: (day: string) => number;
}) {
  const cardRef = useRef<View>(null);
  // An offline run left half-way (app closed) still counts: close it out once.
  const closed = useRef(false);
  useEffect(() => {
    if (saved.status !== 'in_progress' || closed.current) return;
    closed.current = true;
    onSave({ ...saved, status: 'done', updatedAt: new Date().toISOString() });
    onFinish(saved.day);
  }, [saved, onSave, onFinish]);

  return (
    <Screen footer={<SummaryButtons record={saved} boardName={board.name} cardRef={cardRef} />}>
      <BackBar onBack={leave} close title={`${board.name} · today`} />
      <Text style={styles.already}>You&apos;ve played today&apos;s {board.name} run. New runs every day at 00:00 UTC (5:30 AM IST).</Text>
      <RunSummary record={saved} boardName={board.name} cardRef={cardRef} />
    </Screen>
  );
}

function SummaryButtons({ record, boardName, cardRef }: { record: RunRecord; boardName: string; cardRef: RefObject<View | null> }) {
  return (
    <View style={styles.footerRow}>
      <View style={{ flex: 1 }}>
        <Button title="Share" icon="share-outline" variant="subtle" onPress={() => shareRun(record, boardName, cardRef)} />
      </View>
      <View style={{ flex: 1 }}>
        <Button title="Done" onPress={leave} />
      </View>
    </View>
  );
}

type Stage = 'checking' | 'intro' | 'running' | 'error';

function LiveRun({
  board,
  day,
  driver,
  chill,
  nextStreak,
  onSave,
  onFinish,
  onAlreadyFinished,
}: {
  board: Board;
  day: string;
  driver: RunDriver;
  chill: boolean;
  nextStreak: number | undefined;
  onSave: (r: RunRecord) => void;
  onFinish: (day: string) => number;
  onAlreadyFinished: (r: RunRecord) => void;
}) {
  const [stage, setStage] = useState<Stage>('checking');
  const [resuming, setResuming] = useState(0);
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [busy, setBusy] = useState(false);
  const [msLeft, setMsLeft] = useState(QUESTION_MS);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [finalRecord, setFinalRecord] = useState<RunRecord | null>(null);
  const busyRef = useRef(false);
  const cardRef = useRef<View>(null);
  const finishedRef = useRef(false);
  const recapRequested = useRef(false);

  const dispatch = useCallback((a: RunAction) => setRun((s) => (s ? runReducer(s, a) : s)), []);

  /** Runs one server/driver step, with a busy guard and an error that retries the same step. */
  const step = useCallback(async function runStep(fn: () => Promise<void>): Promise<void> {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await fn();
      setError(null);
    } catch (e) {
      setError({ message: messageOf(e), retry: () => runStep(fn) });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);

  const loadFinished = useCallback(async () => {
    const items = await driver.recap();
    const rec = recordFromRecap(items, day, board.id, items.length || board.runLength);
    onSave(rec);
    onAlreadyFinished(rec);
  }, [driver, day, board, onSave, onAlreadyFinished]);

  // Opening the screen: new, half-way (resume) or already finished elsewhere?
  const check = useCallback(
    () =>
      step(async () => {
        const p = await driver.peek();
        if (p.state === 'finished') return loadFinished();
        setResuming(p.state === 'in_progress' ? p.answered : 0);
        setStage('intro');
      }),
    [driver, step, loadFinished],
  );

  useEffect(() => {
    check();
  }, [check]);

  const begin = () =>
    step(async () => {
      const s = await driver.start();
      if (s.status === 'finished') return loadFinished();
      setRun(startRun(s.questionCount, { chill, startIndex: s.startIndex, startTotal: s.total }));
      setStage('running');
    });

  // Load each teaser. If the call was already made (reconnect), reveal straight away.
  const index = run?.index;
  const needsTeaser = run?.phase === 'call' && !run.teaser;
  const loadTeaser = useCallback(
    (i: number) =>
      step(async () => {
        const t = await driver.teaser(i);
        dispatch({ type: 'TEASER', teaser: { teaser: t.teaser, category: t.category, lockinStake: t.lockinStake } });
        if (t.call) {
          const r = await driver.call(i, t.call, t.lockin);
          dispatch({ type: 'CALLED', call: r.call, revealed: r, shownAt: r.shownAt, lockin: r.lockin, stake: r.stake });
        }
      }),
    [driver, step, dispatch],
  );
  // Waits for the previous step to finish (busy), otherwise the load would be dropped.
  const hasError = Boolean(error);
  useEffect(() => {
    if (needsTeaser && index !== undefined && !busy && !hasError) loadTeaser(index);
  }, [needsTeaser, index, busy, hasError, loadTeaser]);

  const place = (call: Call, lockin = false) => {
    if (!run) return;
    const i = run.index;
    step(async () => {
      const r = await driver.call(i, call, lockin);
      setMsLeft(QUESTION_MS);
      dispatch({ type: 'CALLED', call: r.call, revealed: r, shownAt: r.shownAt, lockin: r.lockin, stake: r.stake });
    });
  };

  const submit = useCallback(
    (i: number, choice: number | null) =>
      step(async () => {
        const outcome = await driver.answer(i, choice);
        dispatch({ type: 'ANSWERED', outcome });
      }),
    [driver, step, dispatch],
  );

  // The clock. Time left comes from timestamps; the interval only redraws.
  const phase = run?.phase;
  const shownAt = run?.shownAt ?? null;
  useEffect(() => {
    if (phase !== 'question' || shownAt === null || index === undefined) return;
    let sent = false;
    const tick = () => {
      const left = clampMsLeft(QUESTION_MS - (nowMs() - shownAt));
      setMsLeft(left);
      if (left <= 0 && !sent) {
        sent = true;
        submit(index, null);
      }
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [phase, shownAt, index, submit]);

  // Save after every step, so the Play tab knows where you are.
  useEffect(() => {
    if (!run || run.answers.length === 0 || finalRecord) return;
    const done = run.phase === 'summary';
    onSave(recordFromRun(run, day, board.id, done ? 'done' : 'in_progress'));
    if (!done) return;
    if (driver.mode === 'online' && run.index >= run.questionCount && !recapRequested.current) {
      // Online and complete: the server's recap is the source of truth (covers resumed runs too).
      recapRequested.current = true;
      driver
        .recap()
        .then((items) => {
          const full = recordFromRecap(items, day, board.id, run.questionCount, { dayStreak: nextStreak });
          onSave(full);
          setFinalRecord(full);
        })
        .catch(() => {});
    }
    // The streak counts a finished run (or an offline run ended early, which can't be resumed).
    if (!finishedRef.current && (driver.mode === 'offline' || run.index >= run.questionCount)) {
      finishedRef.current = true;
      onFinish(day);
    }
  }, [run, day, board.id, driver, onSave, onFinish, finalRecord, nextStreak]);

  const inRun = stage === 'running' && run?.phase !== 'summary';

  // Android back button: ask before leaving a run.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!inRun) return false;
      setConfirmQuit(true);
      return true;
    });
    return () => sub.remove();
  }, [inRun]);

  const momentKey = `${run?.answers.length ?? 0}-${run?.phase ?? ''}`;
  const moment: MomentId | null = run && dismissed !== momentKey ? run.spotlight : null;
  const clearMoment = useCallback(() => setDismissed(momentKey), [momentKey]);

  const onClose = () => (inRun ? setConfirmQuit(true) : leave());
  const next = () => dispatch({ type: 'NEXT', dayStreak: nextStreak });

  const header = (
    <BackBar
      onBack={onClose}
      close
      title={run && run.phase !== 'summary' ? `${board.name} · ${Math.min(run.index + 1, run.questionCount)}/${run.questionCount}` : board.name}
      right={run ? <Pill text={`${formatPoints(run.total)} Aura`} color={C.text} filled={C.surfaceHi} /> : undefined}
    />
  );

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (stage === 'checking') {
    body = <Loading />;
  } else if (stage === 'intro') {
    body = (
      <Animated.View entering={FadeIn.duration(250)}>
        <Text style={styles.introEmoji}>{board.emoji}</Text>
        <Text style={styles.introTitle}>{board.id === 'mixed' ? "Today's Mixed run" : `Today's ${board.name} run`}</Text>
        <Text style={styles.introSub}>
          {plannedRunLength(board.id, board.runLength, day)} questions · 15 seconds each · one attempt{board.id === 'mixed' ? ' · global board' : ' · weekly board'}
        </Text>
        {resuming > 0 ? (
          <Card style={{ marginTop: S.xl }}>
            <Text style={[T.bodyStrong, { color: C.text }]}>You&apos;re {resuming} questions in</Text>
            <Text style={[T.small, { color: C.muted, marginTop: 4 }]}>Pick up where you left off. A question that was showing when you left counts as a timeout.</Text>
          </Card>
        ) : (
          <Card style={{ marginTop: S.xl, gap: S.lg }}>
            <Rule icon="eye-outline" text="You see the opening words of each question first." />
            <Rule icon="flash-outline" text="Then call it: Safe 1×, Sure 2× or All-in 3×. Wrong calls cost Aura." />
            <Rule icon="timer-outline" text="The options appear and the 15-second clock starts. Faster = up to +50 bonus." />
            <Rule icon="lock-closed-outline" text="Once you start, this is your one attempt for today." />
          </Card>
        )}
      </Animated.View>
    );
    footer = <Button title={resuming > 0 ? 'Continue run' : 'Start run'} icon="play" loading={busy} onPress={begin} />;
  } else if (run && run.phase === 'summary') {
    const record = finalRecord ?? recordFromRun(run, day, board.id, 'done');
    body = (
      <>
        {run.answers.length < run.questionCount && driver.mode === 'online' ? (
          <Text style={styles.already}>Run paused. Come back before 00:00 UTC to finish it.</Text>
        ) : null}
        <RunSummary record={record} boardName={board.name} cardRef={cardRef} />
      </>
    );
    footer = <SummaryButtons record={record} boardName={board.name} cardRef={cardRef} />;
  } else if (run && run.phase === 'call') {
    body = run.teaser ? (
      <Animated.View key={`call-${run.index}`} entering={FadeInDown.duration(260)}>
        <Dots total={run.questionCount} index={run.index} answers={run.answers.map((a) => a.correct)} offset={run.index - run.answers.length} />
        <Text style={[T.label, { color: C.muted, marginTop: S.xl }]}>{categoryLabel(run.teaser.category)}</Text>
        <Card style={styles.teaserCard}>
          <Text style={styles.teaser}>“{run.teaser.teaser}”</Text>
        </Card>
        <Text style={styles.callPrompt}>Make your call</Text>
        <View pointerEvents={busy ? 'none' : 'auto'} style={busy ? { opacity: 0.6 } : undefined}>
          <CallPicker onCall={place} lockinStake={run.teaser.lockinStake} onLockIn={() => place('allin', true)} />
        </View>
      </Animated.View>
    ) : (
      <Loading />
    );
  } else if (run && run.call && run.revealed && run.teaser && (run.phase === 'question' || run.phase === 'result')) {
    const last = run.phase === 'result' ? run.answers[run.answers.length - 1] : undefined;
    const q = run.phase === 'result' ? run.questions[run.questions.length - 1] : undefined;
    const optionState = (i: number): OptionState => {
      if (!last || !q) return 'idle';
      if (i === q.answerIndex) return 'correct';
      if (i === last.choice) return 'wrong';
      return 'dim';
    };
    const i = run.index;
    body = (
      <View>
        {run.phase === 'question' ? (
          <TimerBar msLeft={msLeft} running color={CALL_COLOR[run.call].main} />
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
          {run.lockin ? (
            <View style={styles.lockTag}>
              <Text style={styles.lockTagText}>🔒 LOCK-IN · {formatPoints(run.stake)} AURA</Text>
            </View>
          ) : (
            <CallTag call={run.call} size="md" />
          )}
          <Text style={[T.label, { color: C.faint }]}>{categoryLabel(run.teaser.category)}</Text>
        </View>
        <Text style={styles.prompt}>{run.revealed.prompt}</Text>
        <View style={{ gap: S.sm, marginTop: S.xl }}>
          {run.revealed.options.map((opt, oi) => (
            <OptionButton
              key={oi}
              index={oi}
              text={opt}
              state={optionState(oi)}
              disabled={run.phase !== 'question' || busy}
              onPress={() => submit(i, oi)}
            />
          ))}
        </View>
        {busy && run.phase === 'question' ? <Text style={styles.checking}>Checking…</Text> : null}
      </View>
    );
    if (run.phase === 'result') {
      const lastQ = run.index === run.questionCount - 1;
      footer = <Button title={lastQ ? 'See results' : 'Next question'} icon={lastQ ? 'trophy-outline' : 'arrow-forward'} onPress={next} />;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen footer={error ? <Button title="Try again" icon="refresh" onPress={error.retry} /> : footer}>
        {header}
        {error ? (
          <Card style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={20} color={C.bad} />
            <Text style={styles.errorText}>{error.message}</Text>
          </Card>
        ) : null}
        {body}
      </Screen>
      {moment ? <MomentOverlay key={`${moment}-${momentKey}`} id={moment} chill={chill} onDone={clearMoment} /> : null}
      {confirmQuit ? (
        <View style={styles.scrim}>
          <Card style={styles.confirm}>
            <Text style={[T.h2, { color: C.text }]}>{driver.mode === 'online' ? 'Pause this run?' : 'End this run?'}</Text>
            <Text style={[T.body, { color: C.muted, marginTop: S.sm }]}>
              {driver.mode === 'online'
                ? 'You can finish it later today. If a question is showing, the clock keeps running and it counts as a timeout.'
                : "It still counts as today's attempt. Questions you haven't answered get 0 Aura. The clock keeps running while you decide."}
            </Text>
            <View style={[styles.footerRow, { marginTop: S.xl }]}>
              <View style={{ flex: 1 }}>
                <Button title="Keep playing" variant="subtle" onPress={() => setConfirmQuit(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={driver.mode === 'online' ? 'Leave' : 'End run'}
                  color={C.bad}
                  ink="#2A0008"
                  onPress={() => {
                    setConfirmQuit(false);
                    if (driver.mode === 'online') leave();
                    else dispatch({ type: 'QUIT' });
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

function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={C.accent} />
    </View>
  );
}

function categoryLabel(category: string): string {
  const b = boardById(category);
  return b ? `${b.emoji}  ${b.name}` : category;
}

function Rule({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.rule}>
      <Ionicons name={icon} size={20} color={C.accent} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

/** Progress dots: green right, red wrong, grey answered earlier (resumed), outlined current. */
function Dots({ total, index, answers, offset }: { total: number; index: number; answers: boolean[]; offset: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Question ${index + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        // Questions answered before a resume aren't in `answers`: they show grey.
        const a = i >= offset ? answers[i - offset] : undefined;
        const before = i < index;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              before && { backgroundColor: a === undefined ? C.faint : a ? C.good : C.bad, borderColor: 'transparent' },
              i === index && { borderColor: C.accent, width: 22 },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', gap: S.md },
  already: { ...T.small, color: C.muted, textAlign: 'center', marginBottom: S.sm },
  loading: { paddingVertical: 80, alignItems: 'center' },
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
  lockTag: { backgroundColor: LOCKIN_GOLD, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  lockTagText: { color: '#2A1D00', fontFamily: F.black, fontSize: 12, letterSpacing: 0.6 },
  resultRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  resultWord: { fontFamily: F.display, fontSize: 32 },
  resultPts: { fontFamily: F.display, fontSize: 32 },
  checking: { ...T.small, color: C.muted, textAlign: 'center', marginTop: S.md },
  errorCard: { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, marginBottom: S.lg, borderColor: C.bad },
  errorText: { flex: 1, color: C.text, fontFamily: F.medium, fontSize: 14 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.scrim, justifyContent: 'center', padding: S.xl, zIndex: 30 },
  confirm: { borderRadius: R.xl },
});

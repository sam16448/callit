/**
 * One-off Supabase Edge Function: imports Open Trivia DB into `questions`,
 * using the same tested conversion as scripts/import-questions.ts
 * (src/data/opentdb.ts). It's an alternative to running that script locally.
 *
 * Resumable: each call works for about 45 seconds; call again until `done` is true.
 *
 *   POST {}  → first call adds our own questions, later calls continue.
 * Progress is saved in public.import_jobs after every request.
 *
 * Needs the header x-import-secret matching a row in public.import_jobs, so
 * only someone with database access can start an import.
 *
 * Deploy: esbuild bundles this file with its imports (npm run build:import-fn),
 * because the Edge runtime can't resolve the app's "@/…" paths.
 */
import { OPENTDB_TO_BOARD, convertAll, countByBoard, type OpenTdbRecord, type QuestionRow } from '../../../src/data/opentdb';
import { SAMPLE_QUESTIONS } from '../../../src/data/sampleQuestions';
import { teaserFor } from '../../../src/game/teaser';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const API = 'https://opentdb.com';
const WAIT_MS = 5_300;
/** Default work per call; the platform cut calls off at about 84 s, so stay well under. */
const BUDGET_MS = 45_000;

type Cat = { id: number; name: string; left: number | null };
type State = { token: string; queue: Cat[]; imported: number; skipped: number; requests: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function db(path: string, init: RequestInit = {}): Promise<Response> {
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`DB ${path}: ${res.status} ${await res.text()}`);
  return res;
}

async function upsert(rows: QuestionRow[]) {
  if (!rows.length) return;
  await db('questions?on_conflict=source_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
}

/** The import job for this secret (with its saved progress), or null if the secret is wrong. */
async function jobFor(req: Request): Promise<{ secret: string; state: State | null } | null> {
  const secret = req.headers.get('x-import-secret') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(secret)) return null;
  const res = await db(`import_jobs?secret=eq.${secret}&select=secret,state`);
  const rows = (await res.json()) as { secret: string; state: State | null }[];
  return rows[0] ?? null;
}

/** Saves progress after every request, so a dropped connection loses nothing. */
async function saveState(secret: string, state: State) {
  await db(`import_jobs?secret=eq.${secret}`, { method: 'PATCH', body: JSON.stringify({ state }) });
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`opentdb ${res.status}`);
  return (await res.json()) as T;
}

function ownQuestions(): QuestionRow[] {
  return SAMPLE_QUESTIONS.map((q) => ({
    source: 'callit',
    source_id: `callit:${q.id}`,
    board: q.category,
    prompt: q.prompt,
    teaser: teaserFor(q).replace(/…$/, ''),
    options: q.options,
    answer_index: q.answerIndex,
    difficulty: q.difficulty,
  }));
}

async function firstState(): Promise<State> {
  await upsert(ownQuestions());
  const { trivia_categories } = await getJson<{ trivia_categories: { id: number; name: string }[] }>(`${API}/api_category.php`);
  await sleep(WAIT_MS);
  const { token } = await getJson<{ token: string }>(`${API}/api_token.php?command=request`);
  const queue = trivia_categories.filter((c) => OPENTDB_TO_BOARD[c.name]).map((c) => ({ id: c.id, name: c.name, left: null }));
  return { token, queue, imported: 0, skipped: 0, requests: 2 };
}

async function work(state: State, started: number, budget: number, save: (s: State) => Promise<void>): Promise<State> {
  const s = { ...state, queue: state.queue.map((c) => ({ ...c })) };
  while (s.queue.length && Date.now() - started < budget) {
    await save(s);
    await sleep(WAIT_MS);
    const cat = s.queue[0];
    s.requests++;
    if (cat.left === null) {
      const c = await getJson<{ category_question_count: { total_question_count: number } }>(`${API}/api_count.php?category=${cat.id}`);
      cat.left = c.category_question_count.total_question_count;
      continue;
    }
    if (cat.left <= 0) {
      s.queue.shift();
      continue;
    }
    const amount = Math.min(50, cat.left);
    const res = await getJson<{ response_code: number; results: OpenTdbRecord[] }>(
      `${API}/api.php?amount=${amount}&category=${cat.id}&encode=url3986&token=${s.token}`,
    );
    if (res.response_code === 5) continue; // rate limited: wait and retry
    if (res.response_code !== 0 || !res.results?.length) {
      s.queue.shift(); // 1/4: nothing left for this category
      continue;
    }
    const { rows } = convertAll(res.results);
    await upsert(rows);
    s.imported += rows.length;
    s.skipped += res.results.length - rows.length;
    cat.left -= res.results.length;
    if (cat.left <= 0) s.queue.shift();
  }
  await save(s);
  return s;
}

Deno.serve(async (req) => {
  const started = Date.now();
  try {
    const job = req.method === 'POST' ? await jobFor(req) : null;
    if (!job) return new Response('Forbidden', { status: 403 });
    const body = (await req.json().catch(() => ({}))) as { budgetMs?: number };
    const budget = Math.min(60_000, Math.max(10_000, body.budgetMs ?? BUDGET_MS));
    const save = (s: State) => saveState(job.secret, s);
    let state = job.state ?? (await firstState());
    state = await work(state, started, budget, save);
    const done = state.queue.length === 0;
    let counts: Record<string, number> | undefined;
    if (done) {
      const res = await db('questions?select=board&active=eq.true', { headers: { Range: '0-99999' } });
      counts = countByBoard((await res.json()) as QuestionRow[]);
    }
    return Response.json({ done, state, next: state.queue[0]?.name ?? null, counts });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
});

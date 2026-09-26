/**
 * One-time question import: Open Trivia DB → your Supabase `questions` table.
 *
 *   npm run import:questions
 *
 * 1. Downloads every Open Trivia DB question for our 20 source categories
 *    (about 10 minutes: the API allows one request every 5 seconds). The raw
 *    download is cached in data/questions/opentdb-raw.json (not committed), so
 *    running it again skips straight to the upload.
 * 2. Converts them (src/data/opentdb.ts) and adds our own questions.
 * 3. Asks for your Supabase service_role key and uploads. The key is only kept
 *    in memory for this run: never put it in .env, the app or the repo.
 *
 * Needs EXPO_PUBLIC_SUPABASE_URL in .env. Run with --download-only to skip the upload.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { OPENTDB_TO_BOARD, convertAll, countByBoard, type OpenTdbRecord, type QuestionRow } from '../src/data/opentdb';
import { SAMPLE_QUESTIONS } from '../src/data/sampleQuestions';
import { teaserFor } from '../src/game/teaser';
import type { CategoryId } from '../src/game/types';

const API = 'https://opentdb.com';
const DATA_DIR = join(__dirname, '..', 'data', 'questions');
const RAW_CACHE = join(DATA_DIR, 'opentdb-raw.json');
const WAIT_MS = 5_300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) throw new Error('rate limited');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (e) {
      if (attempt >= 5) throw e;
      console.log(`  retrying (${(e as Error).message})…`);
      await sleep(WAIT_MS * attempt);
    }
  }
}

async function download(): Promise<OpenTdbRecord[]> {
  if (existsSync(RAW_CACHE)) {
    const cached = JSON.parse(readFileSync(RAW_CACHE, 'utf8')) as OpenTdbRecord[];
    console.log(`Using the cached download (${cached.length} questions). Delete ${RAW_CACHE} to download again.`);
    return cached;
  }

  const { trivia_categories } = await getJson<{ trivia_categories: { id: number; name: string }[] }>(`${API}/api_category.php`);
  const wanted = trivia_categories.filter((c) => OPENTDB_TO_BOARD[c.name]);
  const { token } = await getJson<{ token: string }>(`${API}/api_token.php?command=request`);
  const all: OpenTdbRecord[] = [];

  for (const cat of wanted) {
    await sleep(WAIT_MS);
    const count = await getJson<{ category_question_count: { total_question_count: number } }>(`${API}/api_count.php?category=${cat.id}`);
    let left = count.category_question_count.total_question_count;
    console.log(`${cat.name}: ${left} questions`);
    while (left > 0) {
      await sleep(WAIT_MS);
      const amount = Math.min(50, left);
      const res = await getJson<{ response_code: number; results: OpenTdbRecord[] }>(
        `${API}/api.php?amount=${amount}&category=${cat.id}&encode=url3986&token=${token}`,
      );
      if (res.response_code === 5) {
        console.log('  rate limited, waiting…');
        continue;
      }
      if (res.response_code !== 0 || !res.results?.length) break; // 4 = this category is used up
      all.push(...res.results);
      left -= res.results.length;
      process.stdout.write(`  +${res.results.length} (total ${all.length})\n`);
    }
  }

  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(RAW_CACHE, JSON.stringify(all));
  console.log(`Downloaded ${all.length} questions.`);
  return all;
}

/** Our own questions: the 30 samples plus any data/questions/*.callit.json files (e.g. cricket, bollywood). */
function ownQuestions(): QuestionRow[] {
  const rows: QuestionRow[] = SAMPLE_QUESTIONS.map((q) => ({
    source: 'callit',
    source_id: `callit:${q.id}`,
    board: q.category,
    prompt: q.prompt,
    teaser: teaserFor(q).replace(/…$/, ''),
    options: q.options,
    answer_index: q.answerIndex,
    difficulty: q.difficulty,
  }));
  if (!existsSync(DATA_DIR)) return rows;
  for (const file of readdirSync(DATA_DIR).filter((f) => f.endsWith('.callit.json'))) {
    const list = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8')) as {
      id: string;
      category: CategoryId;
      prompt: string;
      teaser?: string;
      options: string[];
      answerIndex: number;
      difficulty: QuestionRow['difficulty'];
    }[];
    for (const q of list) {
      rows.push({
        source: 'callit',
        source_id: `callit:${q.id}`,
        board: q.category,
        prompt: q.prompt,
        teaser: teaserFor(q).replace(/…$/, ''),
        options: q.options,
        answer_index: q.answerIndex,
        difficulty: q.difficulty,
      });
    }
    console.log(`Added ${list.length} questions from ${file}`);
  }
  return rows;
}

function readEnvUrl(): string {
  const envPath = join(__dirname, '..', '.env');
  const fromFile = existsSync(envPath)
    ? readFileSync(envPath, 'utf8')
        .split(/\r?\n/)
        .find((l) => l.startsWith('EXPO_PUBLIC_SUPABASE_URL='))
        ?.split('=')
        .slice(1)
        .join('=')
        .trim()
    : undefined;
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? fromFile ?? '').replace(/\/+$/, '');
  if (!/^https:\/\/.+/.test(url)) throw new Error('Put EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co in .env first.');
  return url;
}

async function upload(rows: QuestionRow[]) {
  const url = readEnvUrl();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log('\nSupabase > Project Settings > API Keys > Secret key (sb_secret_…), or the legacy service_role key. Used for this upload only, never saved.');
  const key = (await rl.question('Paste the secret key and press Enter: ')).trim();
  rl.close();
  if (!key) throw new Error('No key given.');

  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const res = await fetch(`${url}/rest/v1/questions?on_conflict=source_id`, {
      method: 'POST',
      headers: {
        apikey: key,
        // New sb_secret_ keys go only in `apikey`; old service_role JWTs (eyJ…) also need Authorization.
        ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}),
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);
    console.log(`Uploaded ${Math.min(i + 500, rows.length)} / ${rows.length}`);
  }
}

async function main() {
  const raw = await download();
  const { rows, skipped } = convertAll(raw);
  const own = ownQuestions();
  const all = [...rows, ...own];

  console.log(`\n${rows.length} Open Trivia DB questions kept, skipped:`, skipped);
  console.log(`${own.length} Call It questions`);
  const counts = countByBoard(all);
  for (const [board, n] of Object.entries(counts).sort()) {
    console.log(`  ${board.padEnd(12)} ${n}${n < 40 ? '   ⚠ low: runs may repeat within 2 months' : ''}`);
  }

  if (process.argv.includes('--download-only')) return;
  await upload(all);
  console.log('\nDone. Open the app and play a run.');
}

main().catch((e) => {
  console.error(`\n✖ ${(e as Error).message}`);
  process.exit(1);
});

/// <reference types="node" />
/**
 * In-memory Postgres (PGlite) with the real Supabase migration applied and
 * Supabase's `auth` schema stubbed: auth.uid() returns the user we set per call.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

export const MIGRATION = readFileSync(new URL('../../supabase/migrations/20260927000000_init.sql', import.meta.url), 'utf8');

export const CATEGORY_BOARDS = [
  'video-games', 'music', 'general', 'history', 'geography', 'film', 'science', 'pop-culture',
  'tech', 'anime', 'tv', 'books-art', 'sports', 'mind-games', 'cricket', 'bollywood',
];

export async function createDb(users: string[], questionsPerBoard = 20): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await db.exec(MIGRATION);
  if (users.length) await db.query(`insert into auth.users (id) select unnest($1::uuid[])`, [users]);
  const values: string[] = [];
  for (const b of CATEGORY_BOARDS) {
    for (let i = 0; i < questionsPerBoard; i++) {
      values.push(`('${b}', 'Question ${i} about ${b}?', 'Question ${i}', array['Right','Wrong','Other','Else'], 0, 'test-${b}-${i}')`);
    }
  }
  await db.exec(`insert into public.questions (board, prompt, teaser, options, answer_index, source_id) values ${values.join(',')};`);
  return db;
}

export async function asUser<T = Record<string, unknown>>(db: PGlite, uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role;');
  }
}

/** Calls a function by named arguments, like supabase.rpc(fn, { p_x: 1 }). */
export async function rpcNamed<T>(db: PGlite, uid: string, fn: string, args: Record<string, unknown>): Promise<T> {
  const keys = Object.keys(args);
  const call = keys.map((k, i) => `${k} => $${i + 1}`).join(', ');
  const rows = await asUser<{ r: T }>(db, uid, `select * from public.${fn}(${call}) as r`, keys.map((k) => args[k]));
  // Set-returning functions come back as rows; scalar/jsonb ones as { r }.
  if (rows.length === 1 && Object.keys(rows[0] as object).length === 1 && 'r' in (rows[0] as object)) return (rows[0] as { r: T }).r;
  return rows as unknown as T;
}

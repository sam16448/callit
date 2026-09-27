# Call It — Got ball? Prove it.

A daily **ball-knowledge** game about what the internet is talking about right now: memes, trends, brainrot, F1, football, cricket, gaming, pop culture, anime and AI. You **call it** before you answer, and you farm **Aura**.

Each question shows only its opening words first. You call **Safe 1×**, **Sure 2×** or **All-in 3×**. Then the options appear and a 15-second clock starts. Right answers pay `(100 + speed bonus up to 50) × your call` in Aura; wrong ones cost Safe 0, Sure −150, All-in −300. **Skill decides rank; money never does.**

Built with Expo SDK 57 for the RevenueCat Shipaton 2026 Next Gen Award.

## How it plays

- **New runs every day at 00:00 UTC (5:30 AM IST)**, free, one attempt, identical for every player.
- **Mixed run** (10 questions from 10 different boards) feeds the **global board**. Only Mixed counts there, so grinding more boards can't buy global rank.
- **11 boards** (5 questions a day each) with their own weekly leaderboards: 🔥 Trending Now (this month's internet), 🧠 Ball Knowledge (memes 2022+), 📈 Trends Vault (every Insta/TikTok trend since 2022), 🗿 Brainrot, 🏎️ F1, ⚽ Football, 🏏 Cricket, 🎮 Gaming, 🎬 Pop Culture, 🍥 Anime, 🤖 Tech & AI.
- **Generational Lock-In 🔒**: once per run, after reading the opening words, stake your **whole week's Aura on that board**. Right: your week doubles. Wrong or out of time: it goes to 0. Two taps to confirm, enforced by the server.
- **Tricky and current**: questions are written and fact-checked for Call It about what's trending, each with a source and the date it was true. Distractors are the near-misses (Oxford's word vs Merriam-Webster's, the 2024 answer vs the 2025 one).
- **The Call It crew**: original brainrot-style characters (Frigorifero Flamingetto, Samosa Supremo, Chai Chai Occhialini, Mangolino Reale…) to play as, and they dance or melt down on the big moments: GENERATIONAL, FUMBLED THE BAG, AURA +1000, cooked, clutch, perfect run.
- Boards reset every Monday. Small boards mean a few friends can still take the crown.

## Fair by design

- **Scored on the server.** The phone gets the opening words, then the options only after the call is locked in, and never the right answer until it has answered. Supabase functions do the scoring, timing and Lock-In stakes (`supabase/migrations/`).
- **The question bank isn't in this repo.** It lives only in the database, so answers can't be looked up mid-run. The repo ships 30 separate sample questions for the offline demo.
- **One answer per question, one attempt per day, one Lock-In per run**, enforced by the database, not the app.
- **The clock is the server's**, with 1.5 s of grace for network lag.
- **Row-level security everywhere.** Players can't read questions, answers or other people's runs; every write goes through checked functions.
- **Call It Pro never gives Aura.**

## Status

| Part | State |
| --- | --- |
| Onboarding (nickname + crew character, no password), Play tab, full run: call → question → result → summary | ✅ |
| Aura, Generational Lock-In, moments with crew animations, daily runs, resume a paused run | ✅ tested |
| Supabase: server scoring, security, weekly boards, ~280 fact-checked trending questions on 11 boards | ✅ live, tested on real Postgres |
| Call It Pro with RevenueCat: paywall per reason, restore, preview mode in Expo Go | ✅ |
| Practice (separate question pool, 20 free a day, unlimited with Pro) | ✅ |
| Leagues: join with a code (free), create (Pro), league boards, `callit://join/CODE` invites | ✅ |
| RevenueCat webhook → server-side Pro (expiry-safe), Pro badge on boards | ✅ live |
| Share card image (Aura, grid, biggest moment, no spoilers) | ✅ |
| CC0 sounds, stats, streak shield, weekly question drops | ⏳ |

## How Call It uses RevenueCat

- **One entitlement, two products**: `pro` from `callit_pro_monthly` ($2.99) and `callit_pro_annual` ($14.99) in the `default` offering. Prices on the paywall come from RevenueCat, so they're localised by the store.
- **Paywall only at natural moments**, each with its own honest headline: the 21st practice question, creating a league, and later stats / streak shield / effects. It never interrupts a ranked run, and perks not built yet are labelled *Soon*.
- **Never pay-to-win**: ranked runs are free, one attempt, the same for everyone; Pro changes no score. The paywall says so.
- **Same identity everywhere**: RevenueCat logs in with the Supabase player id, so the **webhook** (`supabase/functions/revenuecat-webhook`) can keep `profiles.is_pro` / `pro_until` in sync on the server: purchases, renewals, cancellations (Pro until expiry), expirations and transfers, with retries ignored by event id.
- **Works everywhere**: live purchases in development/store builds; a labelled preview mode in Expo Go; a demo mode with no key for anyone running the open-source repo.

## Run it

You need [Node.js LTS](https://nodejs.org) and [Git](https://git-scm.com).

```bash
git clone https://github.com/sam16448/callit.git
cd callit
npm install
npx expo start
```

With no keys it runs as an **offline demo**: 33 bundled sample questions (3 per board), scored on the phone with the same rules. To switch on the online version (server scoring, live leaderboards, your own question bank), follow **[docs/SETUP.md](docs/SETUP.md)**.

Checks: `npm run lint`, `npm run typecheck`, `npm test`.

## Tests

`npm test` runs the Vitest suite, including:

- `tests/sql.test.ts` runs **every database migration** on an in-memory Postgres ([PGlite](https://pglite.dev)): scoring matches the app for every call and time, Lock-In stakes, no double answers or skipping ahead, timeouts, lag grace, streaks, leaderboards, leagues and the security rules.
- `tests/online.test.ts` plays the app's **online driver against that database**: full runs, Lock-In, resuming a half-finished run, errors and the leaderboard.
- Game logic, moments, daily question picking, avatars, practice, Pro copy and share text.

## Project layout

```
src/app/                 Screens (Expo Router): tabs, onboarding, run, how to play
src/game/                Rules: scoring, moments, Lock-In, run state machine, drivers, daily sets
src/components/brainrot/ The Call It crew: original SVG characters and their animations
src/services/            Supabase client, typed API, online driver, purchases
src/data/                30 offline sample questions
supabase/migrations/     Database: tables, security, server functions
supabase/functions/      RevenueCat webhook
tests/                   Vitest suite
```

## Licences

- App code: **MIT** (see `LICENSE`).
- Sample questions: **CC BY-SA 4.0** (see `data/questions/LICENSE`). The live question bank is private on purpose.
- Only original art (the crew is drawn from scratch in SVG) and CC0 sounds are used.

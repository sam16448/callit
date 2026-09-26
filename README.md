# Call It

A daily trivia league where you **call it** before you answer.

Each question shows only its opening words first. You call **Safe 1×**, **Sure 2×** or **All-in 3×**. Then the options appear and a 15-second clock starts. Right answers pay `(100 + speed bonus up to 50) × your call`; wrong ones cost Safe 0, Sure −150, All-in −300. **Skill decides rank; money never does.**

Built with Expo SDK 57 for the RevenueCat Shipaton 2026 Next Gen Award.

## How it plays

- **New runs every day at 00:00 UTC**, free, one attempt, identical for every player.
- **Mixed run** (10 questions from all topics) feeds the **global board**. Only Mixed counts there, so playing more categories can't buy global rank.
- **15 category runs** (5 questions each) have their own weekly boards: Video Games, Music, General Knowledge, History, Geography, Film, Science & Nature, Pop Culture, Tech, Anime & Manga, TV, Books & Art, Sports, Mind Games, plus Cricket and Bollywood.
- Boards reset every Monday. Small boards mean a few friends can still win a crown.
- **Moments**: one meme-style reaction per question (All-in hit "AURA +1000", All-in miss "cooked", Clutch, Speedrun, Locked in…), tap to skip, or Chill mode.

## Fair by design

- **Scored on the server.** The phone gets the opening words, then the options only after the call is locked in, and never the right answer until it has answered. Supabase functions do the scoring and timing (`supabase/migrations/…init.sql`).
- **One answer per question, one attempt per day**, enforced by the database (primary keys), not the app.
- **The clock is the server's.** The start time comes from the server, with 1.5 s of grace for network lag.
- **Row-level security everywhere.** Players can't read questions, answers or other people's runs; every write goes through checked functions.
- **Call It Pro will never give points.**

## Status

| Part | State |
| --- | --- |
| Onboarding (nickname + avatar, no password), Play tab, full run: call → question → result → summary | ✅ |
| Scoring, moments, daily runs, share text | ✅ tested |
| Supabase schema, security, server scoring, weekly boards, leagues backend | ✅ tested on real Postgres |
| Question importer (Open Trivia DB → 16 boards) | ✅ |
| Live Board tab (Top / Near you), resume a paused run | ✅ |
| RevenueCat Pro + paywall, leagues screens + invite links, share card | ⏳ next |
| Effects (Skia/Lottie), CC0 sounds, Cricket & Bollywood questions | ⏳ |

## Run it

You need [Node.js LTS](https://nodejs.org) and [Git](https://git-scm.com).

```bash
git clone https://github.com/sam16448/callit.git
cd callit
npm install
npx expo start
```

With no keys it runs as an **offline demo**: 30 bundled questions, scored on the phone with the same rules. To switch on the online version (all boards, server scoring, live leaderboards), follow **[docs/SETUP.md](docs/SETUP.md)**.

Checks: `npm run lint`, `npm run typecheck`, `npm test`.

## Tests

`npm test` runs 77 tests, including:

- `tests/sql.test.ts` runs the **real database migration** on an in-memory Postgres ([PGlite](https://pglite.dev)): scoring matches the app for every call and time, no double answers or skipping ahead, timeouts, lag grace, streaks, leaderboards, leagues and the security rules.
- `tests/online.test.ts` plays the app's **online driver against that database**: full runs, resuming a half-finished run, errors and the leaderboard.
- Game logic, moments, daily question picking, the importer and share text.

## Project layout

```
src/app/                 Screens (Expo Router): tabs, onboarding, run, how to play
src/game/                Rules: scoring, moments, run state machine, drivers, daily sets
src/services/            Supabase client, typed API, online driver
src/data/                Sample questions, Open Trivia DB converter
supabase/migrations/     Database: tables, security, server functions
scripts/                 One-time question importer
tests/                   Vitest suite
```

## Licences

- App code: **MIT** (see `LICENSE`).
- Question data: **CC BY-SA 4.0** (see `data/questions/LICENSE`). Category questions come from the [Open Trivia Database](https://opentdb.com); the sample, Cricket and Bollywood questions are written for Call It.
- Only original art and CC0 sounds are used.

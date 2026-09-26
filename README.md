# Call It

A daily trivia league where you **call it** before you answer. See the opening words, pick **Safe 1×**, **Sure 2×** or **All-in 3×**, then the options appear and a 15-second clock starts. Skill decides rank; money never does.

Built with Expo SDK 57 for the RevenueCat Shipaton 2026 Next Gen Award.

## Status (work in progress)

- ✅ Onboarding (nickname + avatar, no password), Play tab, full offline run: call → question → result → summary
- ✅ Scoring, moment triggers, daily seeded runs, share text, with Vitest tests
- ⏳ Supabase backend (server scoring, boards), RevenueCat Pro, leagues, effects and sounds

## Scoring

Right: `(100 + speed bonus up to 50) × call`. Wrong or timeout: Safe 0, Sure −150, All-in −300. See `src/game/scoring.ts`.

## Run it

```bash
npm install
npx expo start
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`.

## Licences

App code: MIT (see `LICENSE`). The 30 sample questions in `src/data/sampleQuestions.ts` were written for this project. Imported Open Trivia DB questions will keep CC BY-SA 4.0 in `data/questions/LICENSE`.

# Setting up the online version

Without any keys, Call It runs as an **offline demo** on 30 bundled questions.
These steps switch on the real thing: all 16 boards, server scoring and live leaderboards.
It takes about 20 minutes, most of it waiting for the question download.

All commands are for **Windows PowerShell**, run inside the `callit` folder.

## 1. Create the Supabase project (free)

1. Go to [supabase.com](https://supabase.com), sign in with GitHub, click **New project**.
2. Name it `callit`, pick a strong database password (save it somewhere), region **South Asia (Mumbai)**, then **Create new project**. Wait about 2 minutes.

## 2. Create the database

1. In the project, open **SQL Editor** → **New query**.
2. Run each file in `supabase/migrations/` **in order** (oldest first): open it, copy all of it, paste it in and click **Run**.
3. You should see "Success. No rows returned" each time.

Always run the whole set in order: the first file resets function permissions, so running it alone afterwards would lock out the later functions.

## 3. Allow anonymous sign-in

Players don't need an email or password, so turn on anonymous sign-ins:
**Authentication** → **Sign In / Providers** → **Allow anonymous sign-ins** → on → **Save**.

## 4. Put the app keys in `.env`

1. **Project Settings** → **API Keys**. You need the **Project URL** (on the Data API page or the project home) and the **Publishable key** (`sb_publishable_…`).
2. In PowerShell:

   ```powershell
   copy .env.example .env
   notepad .env
   ```

3. Fill in:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Save and close. **Never put the secret key in `.env`**: anything starting with `EXPO_PUBLIC_` is built into the app.

## 5. Import the questions

```powershell
npm install
npm run import:questions
```

- It downloads Open Trivia DB (about 10 minutes, one request every 5 seconds) and prints how many questions each board got.
- Then it asks for the **Secret key**: **Project Settings** → **API Keys** → **Secret keys** → reveal and copy (`sb_secret_…`). Paste it and press Enter. It's used for this upload only and never saved.
- If anything fails, just run it again: the download is cached and re-uploading doesn't create duplicates.
- Alternative without a local download: `supabase/functions/import-questions/index.ts` does the same import inside Supabase as an Edge Function, in resumable batches. That's how the live project was filled.

## 6. Play

```powershell
npx expo start
```

Scan the QR code with Expo Go. Play the Mixed run, then check the **Board** tab. Ask a friend to play too and you'll both show up.

## Checking it worked

In Supabase → **Table Editor**:
- `questions` should have a few thousand rows.
- After you play, `runs` has your run and `daily_sets` has today's questions.

## Good to know

- New runs start at 00:00 UTC (5:30 AM IST). Boards reset Monday 5:30 AM IST.
- Reinstalling the app, or **You → Start over**, makes you a new anonymous player.
- `supabase/migrations/…init.sql` is written for a fresh project. To start over, create a new project rather than re-running it on an old one.

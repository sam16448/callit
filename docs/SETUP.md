# Setting up the online version

Without any keys, Call It runs as an **offline demo** on 30 bundled questions.
These steps switch on the real thing: all 12 boards (Mixed + 11), server scoring and live leaderboards.
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

## 5. Add questions

The live question bank is private (so nobody can look answers up), which means a fresh project starts empty. Add at least 5 active questions per board (Mixed needs at least 10 boards) in **Table Editor** → `questions`, or with SQL:

```sql
insert into public.questions (board, prompt, teaser, options, answer_index, difficulty, source_id, source_url, as_of)
values ('memes', 'Which dictionary made "67" its 2025 Word of the Year?', 'Which dictionary made "67"',
        array['Dictionary.com', 'Oxford', 'Collins', 'Cambridge'], 0, 'medium', 'mine:memes-01',
        'https://www.dictionary.com/articles/word-of-the-year-2025', '2026-09-27');
```

- `board` is one of: `now`, `memes`, `trends`, `brainrot`, `f1`, `football`, `cricket`, `gaming`, `pop-culture`, `anime`, `tech-ai`.
- `teaser` must be the exact opening words of `prompt` (it's what players see before calling).
- `answer_index` counts from 0. Every 5th question id goes to the practice pool, so add a few extra.
- Check with `select * from board_status();` — every board should say `playable = true`.

## 6. RevenueCat webhook (server-side Pro)

This lets the server know who has Call It Pro (for the Pro badge on the boards, and so Pro checks can't be faked from the app).

1. Deploy `supabase/functions/revenuecat-webhook/index.ts` as an Edge Function named `revenuecat-webhook` with **JWT verification off** (RevenueCat can't log in; a shared secret protects it instead).
2. Pick a long random secret. Store only its SHA-256 in the database (SQL Editor):
   ```sql
   insert into public.webhook_secrets (name, sha256)
   values ('revenuecat', encode(sha256(convert_to('YOUR-SECRET', 'UTF8')), 'hex'))
   on conflict (name) do update set sha256 = excluded.sha256;
   ```
3. RevenueCat dashboard → your project → **Integrations** → **Webhooks** → **Add**:
   - URL: `https://<your-project>.supabase.co/functions/v1/revenuecat-webhook`
   - Authorization header value: `YOUR-SECRET`
   - Send a **test event**: it should show as delivered (HTTP 200).
4. Optional, once purchases reach the server reliably: make the server enforce Pro too:
   `update public.app_settings set value = 'true' where key = 'enforce_pro_server';`

## 7. Play

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

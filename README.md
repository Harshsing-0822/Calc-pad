# Calculator 🧮 (a secret notebook for two)

It looks like a normal calculator, and it works like one. Type your **secret code** and press **=** to open
the hidden "History" tape, where the two of you leave each other notes.

## How it works

- **Disguise:** the page is called "Calculator" and does real maths. A wrong code just shows that number, like any calculator would.
- **Encryption:** your code is turned into a key on the phone itself (PBKDF2, then AES-256-GCM). The server and the database only
  ever see scrambled text. Not even Vercel or Neon can read your notes.
- **Server lock:** without the right code, the API answers "404 not found" to everything. After 30 wrong tries
  in 15 minutes, it refuses everyone for a while.
- **Notes are kept forever.** Nothing disappears unless one of you taps **Delete**.
  - **★ Save:** stars a note so it stands out (a favourite)
  - **Keep:** just closes the menu
  - **Delete:** gone right away, for both of you
  - You'll see **sent**, then **seen**, on your own notes.
  - The newest 200 notes load first. Tap **Show earlier** at the top to go further back.
  - *Optional:* if you ever want unstarred notes to vanish after being read, add `FADE_HOURS` = `24` in Vercel's environment variables.
- **Auto-lock:** it goes back to the calculator the moment the tab is switched, the screen turns off, after
  3 minutes of no touching, or when you tap **‹ Calculator**. Nothing is kept on the phone: the key lives in
  memory only, and only the chosen emoji is kept until the tab closes.

## Setup (about 10 minutes)

1. **Pick your secret code.** Digits only, **at least 10** (for example a date and something only you two know: `2911202406`).
   Longer is safer. Don't use a phone number.
2. **Make the access hash.** Install Node, then in this folder run:
   ```
   npm install
   node scripts/make-hash.mjs YOUR_CODE
   ```
   Copy the `ACCESS_HASH=...` value it prints.
3. **Push to a new GitHub repo** (private) and import it in Vercel. Give the project a boring name like
   `calc-pad`, because the name becomes the URL (`calc-pad.vercel.app`).
4. **Add a Neon database:** Vercel → project → Storage → Neon. This adds `DATABASE_URL` for you.
   (Or copy the connection string from your existing Neon account into an env var called `DATABASE_URL`.)
   The tables create themselves on first use.
5. **Add `ACCESS_HASH`** in Vercel → Settings → Environment Variables, then **Redeploy**.
6. Open the URL, type your code, press **=**, and pick your emoji. She picks the other one.

## Tips for her on the family phone

- Use an **Incognito/Private tab**. Then the visit doesn't show up in history, and Gboard won't learn the words she types.
- Type the URL by hand; don't bookmark it. Close the tab when done.
- Opening it just shows a calculator, so a quick glance by anyone reveals nothing.

## Customising

At the top of the `<script>` in `index.html`:
- `PEOPLE`: your two emojis (default 🌙 and 🌻)
- `IDLE_LOCK_MS`: how long before it auto-locks
- **Don't change `SALT` or `ITER`.** If you do, re-run step 2 and update `ACCESS_HASH`, and old notes become unreadable.

**Changing the code later:** old notes can't be read with a new code. Delete or let them fade first, then redo steps 2 and 5.

## Keeping it running forever

- **Vercel Hobby (free):** the deployment stays up with no expiry. It's for personal, non-commercial use, which this is.
- **Neon Free:** there's no time limit. The database sleeps when nobody is using it, so the first open after a quiet spell takes a second or two.
  Storage is 0.5–1 GB, and a note takes well under 1 KB, so that's room for **hundreds of thousands of notes**.
- **Don't** delete the Neon project or remove the Vercel integration. That's the one way to lose everything.
- **Backups (optional, recommended once in a while):** in Neon's console, use the SQL Editor to run `select * from tape` and export it,
  or run `pg_dump` with your `DATABASE_URL`. The backup is still encrypted, so it's safe to keep anywhere. Only your code can read it.

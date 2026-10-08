# Daily Streaks

A private, browser-only daily-goal tracker. Data stays in `localStorage` on the device you use.

Features: daily targets, optional focus timers, extendable goal durations, consecutive-day streaks, and GitHub-style activity cubes.

## Optional cloud sync

The app is local-first by default. To sync Streaks and Tasks between devices, create a free Supabase project, run [supabase.sql](supabase.sql) in its SQL Editor, then use **Cloud sync** in the app to enter the project URL and **Publishable** key from the project’s Connect dialog. Create/sign in with the same email on every device. Do not use a secret key in the app.

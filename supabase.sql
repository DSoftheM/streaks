-- Run this once in Supabase: SQL Editor → New query → Run.
-- The policies ensure that each signed-in person can access only their own data.
create table if not exists public.daily_streaks_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.daily_streaks_data enable row level security;

drop policy if exists "read own daily streaks data" on public.daily_streaks_data;
create policy "read own daily streaks data" on public.daily_streaks_data
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "insert own daily streaks data" on public.daily_streaks_data;
create policy "insert own daily streaks data" on public.daily_streaks_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "update own daily streaks data" on public.daily_streaks_data;
create policy "update own daily streaks data" on public.daily_streaks_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

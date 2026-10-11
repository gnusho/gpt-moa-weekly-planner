-- 1. Replace YOUR_GOOGLE_EMAIL@example.com with the Google email you alone will use.
-- 2. Run in Supabase SQL Editor. Do NOT paste a service_role key into browser code.
create table if not exists public.planner_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.planner_states enable row level security;
revoke all on public.planner_states from anon;
grant select, insert, update on public.planner_states to authenticated;

drop policy if exists "private planner select" on public.planner_states;
drop policy if exists "private planner insert" on public.planner_states;
drop policy if exists "private planner update" on public.planner_states;
create policy "private planner select" on public.planner_states
  for select to authenticated using (
    auth.uid() = user_id and lower(auth.jwt()->>'email') = lower('YOUR_GOOGLE_EMAIL@example.com')
  );
create policy "private planner insert" on public.planner_states
  for insert to authenticated with check (
    auth.uid() = user_id and lower(auth.jwt()->>'email') = lower('YOUR_GOOGLE_EMAIL@example.com')
  );
create policy "private planner update" on public.planner_states
  for update to authenticated using (
    auth.uid() = user_id and lower(auth.jwt()->>'email') = lower('YOUR_GOOGLE_EMAIL@example.com')
  ) with check (
    auth.uid() = user_id and lower(auth.jwt()->>'email') = lower('YOUR_GOOGLE_EMAIL@example.com')
  );

create or replace function public.set_planner_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists planner_states_timestamp on public.planner_states;
create trigger planner_states_timestamp before insert or update on public.planner_states
for each row execute function public.set_planner_updated_at();
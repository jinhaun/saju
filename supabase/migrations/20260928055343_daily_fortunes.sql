create table public.saju_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  birth_date date not null,
  birth_time time without time zone,
  unknown_birth_time boolean not null default false,
  calendar text not null default 'solar',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saju_profiles_birth_date_check
    check (
      birth_date >= date '1900-01-01'
      and birth_date <= date '2026-12-31'
    ),
  constraint saju_profiles_calendar_check
    check (calendar = 'solar'),
  constraint saju_profiles_birth_time_check
    check (
      (unknown_birth_time and birth_time is null)
      or (not unknown_birth_time and birth_time is not null)
    )
);

alter table public.saju_profiles enable row level security;

revoke all privileges on table public.saju_profiles from anon, authenticated;
grant select, insert, update on table public.saju_profiles to authenticated;
grant select, insert, update, delete on table public.saju_profiles to service_role;

create policy "Users can read their own saju profile"
on public.saju_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own saju profile"
on public.saju_profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own saju profile"
on public.saju_profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create table public.daily_fortunes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  fortune_date date not null,
  birth_chart jsonb not null,
  day_pillar jsonb not null,
  fortune jsonb not null,
  model text not null,
  schema_version smallint not null default 1,
  generated_at timestamptz not null default now(),
  constraint daily_fortunes_user_date_unique unique (user_id, fortune_date),
  constraint daily_fortunes_birth_chart_object_check
    check (jsonb_typeof(birth_chart) = 'object'),
  constraint daily_fortunes_day_pillar_object_check
    check (jsonb_typeof(day_pillar) = 'object'),
  constraint daily_fortunes_fortune_object_check
    check (jsonb_typeof(fortune) = 'object'),
  constraint daily_fortunes_schema_version_check
    check (schema_version >= 1)
);

alter table public.daily_fortunes enable row level security;

revoke all privileges on table public.daily_fortunes from anon, authenticated;
grant select on table public.daily_fortunes to authenticated;
grant select, insert, update, delete on table public.daily_fortunes to service_role;

revoke all privileges on sequence public.daily_fortunes_id_seq from anon, authenticated;
grant usage, select on sequence public.daily_fortunes_id_seq to service_role;

create policy "Users can read their own daily fortunes"
on public.daily_fortunes
for select
to authenticated
using ((select auth.uid()) = user_id);

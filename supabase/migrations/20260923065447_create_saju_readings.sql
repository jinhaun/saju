create table public.saju_readings (
  id bigint generated always as identity primary key,
  request_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  birth_date date not null,
  birth_time time without time zone not null,
  topic text not null,
  question text,
  chart jsonb not null,
  reading jsonb not null,
  model text not null,
  schema_version smallint not null default 1,
  created_at timestamptz not null default now(),
  constraint saju_readings_user_request_unique unique (user_id, request_id),
  constraint saju_readings_birth_date_check
    check (
      birth_date >= date '1950-01-01'
      and birth_date <= date '2026-12-31'
    ),
  constraint saju_readings_topic_check
    check (topic in ('relationship', 'career', 'wealth', 'social', 'strengths', 'yearly')),
  constraint saju_readings_question_check
    check (question is null or char_length(question) between 1 and 200),
  constraint saju_readings_chart_object_check
    check (jsonb_typeof(chart) = 'object'),
  constraint saju_readings_reading_object_check
    check (jsonb_typeof(reading) = 'object'),
  constraint saju_readings_schema_version_check
    check (schema_version >= 1)
);

create index saju_readings_user_created_id_idx
  on public.saju_readings (user_id, created_at desc, id desc);

alter table public.saju_readings enable row level security;

revoke all privileges on table public.saju_readings from anon, authenticated;
grant select, insert, delete on table public.saju_readings to authenticated;

revoke all privileges on sequence public.saju_readings_id_seq from anon, authenticated;
grant usage, select on sequence public.saju_readings_id_seq to authenticated;

create policy "Users can read their own saju readings"
on public.saju_readings
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can save their own saju readings"
on public.saju_readings
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own saju readings"
on public.saju_readings
for delete
to authenticated
using ((select auth.uid()) = user_id);

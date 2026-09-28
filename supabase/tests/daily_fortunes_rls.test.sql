begin;

select plan(14);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'fortune-owner@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'fortune-other@example.com');

insert into public.saju_profiles (
  user_id,
  birth_date,
  birth_time,
  unknown_birth_time
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    date '2000-01-01',
    time '08:30',
    false
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    date '2001-02-03',
    null,
    true
  );

insert into public.daily_fortunes (
  user_id,
  fortune_date,
  birth_chart,
  day_pillar,
  fortune,
  model
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    date '2026-09-28',
    '{"pillars": []}'::jsonb,
    '{"text": "甲子"}'::jsonb,
    '{"headline": "owner"}'::jsonb,
    'test-model'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    date '2026-09-28',
    '{"pillars": []}'::jsonb,
    '{"text": "乙丑"}'::jsonb,
    '{"headline": "other"}'::jsonb,
    'test-model'
  );

select ok(
  (select relrowsecurity from pg_class where oid = 'public.saju_profiles'::regclass),
  'saju_profiles has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.daily_fortunes'::regclass),
  'daily_fortunes has RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.saju_profiles', 'select,insert,update,delete'),
  'anon has no access to saju_profiles'
);

select ok(
  not has_table_privilege('anon', 'public.daily_fortunes', 'select,insert,update,delete'),
  'anon has no access to daily_fortunes'
);

select ok(
  has_table_privilege('authenticated', 'public.saju_profiles', 'select,insert,update'),
  'authenticated can read and maintain their saju profile'
);

select ok(
  not has_table_privilege('authenticated', 'public.saju_profiles', 'delete'),
  'authenticated cannot delete saju profiles'
);

select ok(
  has_table_privilege('authenticated', 'public.daily_fortunes', 'select'),
  'authenticated can read daily fortunes'
);

select ok(
  not has_table_privilege('authenticated', 'public.daily_fortunes', 'insert,update,delete'),
  'authenticated cannot write daily fortunes directly'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$select count(*)::bigint from public.saju_profiles$$,
  array[1::bigint],
  'a user sees only their own saju profile'
);

select results_eq(
  $$select birth_date::text from public.saju_profiles$$,
  array['2000-01-01'],
  'the visible saju profile belongs to the signed-in user'
);

select results_eq(
  $$select count(*)::bigint from public.daily_fortunes$$,
  array[1::bigint],
  'a user sees only their own daily fortune'
);

select results_eq(
  $$select fortune ->> 'headline' from public.daily_fortunes$$,
  array['owner'],
  'the visible daily fortune belongs to the signed-in user'
);

select results_eq(
  $$update public.saju_profiles
      set birth_date = date '2000-01-02'
      where user_id = '11111111-1111-4111-8111-111111111111'
      returning birth_date::text$$,
  array['2000-01-02'],
  'a user can update their own saju profile'
);

select throws_ok(
  $$insert into public.daily_fortunes (
      user_id,
      fortune_date,
      birth_chart,
      day_pillar,
      fortune,
      model
    ) values (
      '11111111-1111-4111-8111-111111111111',
      date '2026-09-29',
      '{}'::jsonb,
      '{}'::jsonb,
      '{}'::jsonb,
      'blocked-model'
    )$$,
  '42501',
  null,
  'a user cannot insert a daily fortune directly'
);

select * from finish();
rollback;

insert into public.saju_profiles (
  user_id,
  birth_date,
  birth_time,
  unknown_birth_time,
  calendar,
  created_at,
  updated_at
)
select distinct on (reading.user_id)
  reading.user_id,
  reading.birth_date,
  reading.birth_time,
  reading.birth_time is null,
  'solar',
  reading.created_at,
  now()
from public.saju_readings as reading
where not exists (
  select 1
  from public.saju_profiles as profile
  where profile.user_id = reading.user_id
)
order by reading.user_id, reading.created_at desc, reading.id desc
on conflict (user_id) do nothing;

create index if not exists saju_readings_exact_input_idx
on public.saju_readings (
  user_id,
  birth_date,
  birth_time,
  topic,
  question,
  created_at desc,
  id desc
);

alter table public.saju_readings
  alter column birth_time drop not null;

comment on column public.saju_readings.birth_time is
  'Birth time in the user local timezone. Null means the user does not know the birth time.';

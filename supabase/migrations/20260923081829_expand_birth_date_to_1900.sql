alter table public.saju_readings
  drop constraint saju_readings_birth_date_check;

alter table public.saju_readings
  add constraint saju_readings_birth_date_check
  check (
    birth_date >= date '1900-01-01'
    and birth_date <= date '2026-12-31'
  ) not valid;

alter table public.saju_readings
  validate constraint saju_readings_birth_date_check;

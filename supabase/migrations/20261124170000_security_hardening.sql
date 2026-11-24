-- CERO security hardening (24 Nov 2026).
--
-- 1. Collect less: the worker's DPI (national ID) is no longer stored.
-- 2. Invite codes: 8 characters from a 32-letter alphabet using a secure random source,
--    with at most 5 wrong guesses per account every 15 minutes.
-- 3. Columns can only be written where the app needs to: nobody picks their own invite
--    code, and employers can't change who owns or is linked to a record.
-- 4. Records the worker confirmed, and jobs with history, can't be deleted.
-- 5. Every change to jobs and payments is written to an audit log nobody can edit.
-- 6. Limits on text length and amounts.

-- ------------------------------------------------------------------ 1. Data minimization

alter table public.employments drop column if exists worker_dpi;

-- ------------------------------------------------------------------ 2. Invite codes

create or replace function private.new_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  -- No 0/O or 1/I, so codes are easy to read aloud and type.
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  code text := '';
begin
  -- 256 is a multiple of 32, so every letter is equally likely.
  for i in 0..7 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end;
$$;

revoke all on function private.new_invite_code() from public, anon;
grant execute on function private.new_invite_code() to authenticated;

alter table public.employments alter column invite_code set default private.new_invite_code();
update public.employments set invite_code = private.new_invite_code() where worker_user_id is null;
drop function if exists public.new_invite_code();

create table private.claim_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  succeeded boolean not null,
  attempted_at timestamptz not null default now()
);
create index claim_attempts_user_time_idx on private.claim_attempts (user_id, attempted_at desc);

-- Returns the employment id, or null when the code is wrong or already used.
-- Wrong codes return null instead of raising, so the failed attempt is recorded.
create or replace function public.claim_employment(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  emp_id uuid;
  clean text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'worker') then
    raise exception 'Solo una cuenta de trabajadora puede usar un código';
  end if;

  if (
    select count(*) from private.claim_attempts a
    where a.user_id = auth.uid() and not a.succeeded and a.attempted_at > now() - interval '15 minutes'
  ) >= 5 then
    raise exception 'Demasiados intentos. Espera 15 minutos y vuelve a intentarlo.';
  end if;

  select e.id into emp_id from public.employments e
   where e.invite_code = clean and e.worker_user_id is null and e.status = 'active'
   for update;

  insert into private.claim_attempts (user_id, succeeded) values (auth.uid(), emp_id is not null);
  if emp_id is null then
    return null;
  end if;

  perform set_config('cero.claiming', 'on', true);
  update public.employments set worker_user_id = auth.uid() where id = emp_id;
  perform set_config('cero.claiming', 'off', true);
  return emp_id;
end;
$$;

-- The employer can issue a fresh code, for example if the old one was shared by mistake.
create or replace function public.reset_invite_code(employment_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  fresh text := private.new_invite_code();
begin
  update public.employments e set invite_code = fresh
   where e.id = employment_id and e.employer_id = auth.uid() and e.worker_user_id is null;
  if not found then
    raise exception 'No se pudo cambiar el código';
  end if;
  return fresh;
end;
$$;

revoke execute on function public.claim_employment(text) from public, anon;
revoke execute on function public.reset_invite_code(uuid) from public, anon;
grant execute on function public.claim_employment(text) to authenticated;
grant execute on function public.reset_invite_code(uuid) to authenticated;

-- ------------------------------------------------------------------ 3. Column permissions

revoke insert, update on public.employments from authenticated;
grant insert (employer_id, worker_name, worker_phone, job_type, start_date, days_per_week, live_in,
              monthly_salary, incentive_bonus, economic_zone, igss_precapi)
  on public.employments to authenticated;
grant update (worker_name, worker_phone, job_type, start_date, end_date, days_per_week, live_in,
              monthly_salary, incentive_bonus, economic_zone, igss_precapi, status, end_reason)
  on public.employments to authenticated;

revoke insert, update on public.payments from authenticated;
grant insert (employment_id, kind, period_start, period_end, amount, incentive_bonus, paid_on, method, notes)
  on public.payments to authenticated;
grant update (kind, period_start, period_end, amount, incentive_bonus, paid_on, method, notes)
  on public.payments to authenticated;

revoke all on public.profiles from anon;

-- ------------------------------------------------------------------ 4. Protect history from deletion

drop policy "Employer: delete payments" on public.payments;
create policy "Employer: delete unconfirmed payments" on public.payments
  for delete to authenticated
  using (
    worker_confirmed_at is null
    and exists (select 1 from public.employments e where e.id = payments.employment_id and e.employer_id = (select auth.uid()))
  );

-- Checks for payments without going through the payments policies (which read employments),
-- so the two policies don't loop.
create or replace function private.employment_has_payments(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.payments p where p.employment_id = target);
$$;
revoke all on function private.employment_has_payments(uuid) from public, anon;
grant execute on function private.employment_has_payments(uuid) to authenticated;

drop policy "Employer: delete own employments" on public.employments;
create policy "Employer: delete own employments without history" on public.employments
  for delete to authenticated
  using (
    employer_id = (select auth.uid())
    and worker_user_id is null
    and not private.employment_has_payments(id)
  );

-- ------------------------------------------------------------------ 5. Audit log

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  table_name text not null,
  action text not null,
  row_id uuid not null,
  employment_id uuid not null,
  old_data jsonb,
  new_data jsonb
);
create index audit_log_employment_idx on public.audit_log (employment_id, at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

-- Both sides of a job can read its history; nobody can write or change it through the API.
create policy "Parties read their audit history" on public.audit_log
  for select to authenticated
  using (exists (
    select 1 from public.employments e
    where e.id = audit_log.employment_id
      and (e.employer_id = (select auth.uid()) or e.worker_user_id = (select auth.uid()))
  ));

create or replace function private.write_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_log (actor, table_name, action, row_id, employment_id, old_data, new_data)
  values (
    auth.uid(),
    tg_table_name,
    lower(tg_op),
    (rec ->> 'id')::uuid,
    case when tg_table_name = 'employments' then (rec ->> 'id')::uuid else (rec ->> 'employment_id')::uuid end,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

revoke all on function private.write_audit() from public, anon, authenticated;

create trigger employments_audit after insert or update or delete on public.employments
  for each row execute function private.write_audit();
create trigger payments_audit after insert or update or delete on public.payments
  for each row execute function private.write_audit();

-- ------------------------------------------------------------------ 6. Input limits

alter table public.profiles
  add constraint profiles_full_name_len check (char_length(full_name) <= 120),
  add constraint profiles_phone_format check (phone is null or phone ~ '^[0-9+() -]{6,25}$');

alter table public.employments
  add constraint employments_worker_name_len check (char_length(btrim(worker_name)) between 1 and 120),
  add constraint employments_worker_phone_format check (worker_phone is null or worker_phone ~ '^[0-9+() -]{6,25}$'),
  add constraint employments_salary_max check (monthly_salary <= 1000000),
  add constraint employments_incentive_max check (incentive_bonus <= 10000),
  add constraint employments_start_range check (start_date >= date '1950-01-01');

alter table public.payments
  add constraint payments_amount_max check (amount <= 1000000),
  add constraint payments_incentive_max check (incentive_bonus <= 10000),
  add constraint payments_notes_len check (notes is null or char_length(notes) <= 500),
  add constraint payments_paid_on_range check (paid_on >= date '1950-01-01');

-- ------------------------------------------------------------------ Sign-up safety

-- Never let an odd name or phone typed at sign-up block account creation:
-- trim the name to 120 characters and drop a phone that isn't a phone number.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_phone text := btrim(coalesce(new.raw_user_meta_data ->> 'phone', ''));
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'worker' then 'worker' else 'employer' end,
    left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120),
    case when raw_phone ~ '^[0-9+() -]{6,25}$' then raw_phone end
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- CERO database schema, as applied to the Supabase project "cero" (ktewnuqxaogoiefriano)
-- on 24 Nov 2026 through four migrations, consolidated here in their final form.

-- ============================================================ Tables

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('employer', 'worker')),
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);

create or replace function public.new_invite_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

create table public.employments (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles (id) on delete cascade,
  worker_user_id uuid references public.profiles (id) on delete set null,
  worker_name text not null,
  worker_dpi text,
  worker_phone text,
  job_type text not null default 'limpieza'
    check (job_type in ('limpieza', 'cocina', 'ninera', 'cuidado', 'jardin', 'chofer', 'otro')),
  start_date date not null,
  end_date date,
  days_per_week smallint not null default 5 check (days_per_week between 1 and 7),
  live_in boolean not null default false,
  monthly_salary numeric(12, 2) not null check (monthly_salary >= 0),
  incentive_bonus numeric(12, 2) not null default 250 check (incentive_bonus >= 0),
  economic_zone text not null default 'CE1' check (economic_zone in ('CE1', 'CE2')),
  igss_precapi boolean not null default false,
  status text not null default 'active' check (status in ('active', 'ended')),
  end_reason text check (end_reason in ('renuncia', 'despido_injustificado', 'despido_justificado', 'mutuo_acuerdo', 'otro')),
  invite_code text not null unique default public.new_invite_code(),
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index employments_employer_id_idx on public.employments (employer_id);
create index employments_worker_user_id_idx on public.employments (worker_user_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  employment_id uuid not null references public.employments (id) on delete cascade,
  kind text not null check (kind in ('salario', 'bono14', 'aguinaldo', 'vacaciones', 'indemnizacion', 'otro')),
  period_start date,
  period_end date,
  amount numeric(12, 2) not null check (amount >= 0),
  incentive_bonus numeric(12, 2) not null default 0 check (incentive_bonus >= 0),
  paid_on date not null default current_date,
  method text check (method in ('efectivo', 'transferencia', 'deposito', 'otro')),
  notes text,
  worker_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  check (period_end is null or period_start is null or period_end >= period_start)
);

create index payments_employment_id_idx on public.payments (employment_id);

-- ============================================================ Sign-up

-- Create a profile automatically at sign-up, using the role chosen in the app.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    case when new.raw_user_meta_data ->> 'role' = 'worker' then 'worker' else 'employer' end,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ============================================================ Helpers (not exposed by the API)

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_employer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'employer');
$$;

create or replace function private.is_linked_profile(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.employments e
    where (e.employer_id = target and e.worker_user_id = auth.uid())
       or (e.worker_user_id = target and e.employer_id = auth.uid())
  );
$$;

revoke all on function private.is_employer() from public, anon;
revoke all on function private.is_linked_profile(uuid) from public, anon;
grant execute on function private.is_employer() to authenticated;
grant execute on function private.is_linked_profile(uuid) to authenticated;

-- ============================================================ Row-level security

alter table public.profiles enable row level security;
alter table public.employments enable row level security;
alter table public.payments enable row level security;

create policy "Read own or linked profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.is_linked_profile(id));
create policy "Own profile: update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Users may edit their name and phone, never their role.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated, anon;
revoke all on public.employments, public.payments from anon;

create policy "Employer: read own employments" on public.employments
  for select to authenticated
  using (employer_id = (select auth.uid()) or worker_user_id = (select auth.uid()));
create policy "Employer: create employments" on public.employments
  for insert to authenticated
  with check (employer_id = (select auth.uid()) and worker_user_id is null and (select private.is_employer()));
create policy "Employer: update own employments" on public.employments
  for update to authenticated
  using (employer_id = (select auth.uid()))
  with check (employer_id = (select auth.uid()));
create policy "Employer: delete own employments" on public.employments
  for delete to authenticated using (employer_id = (select auth.uid()));

create policy "Read payments for my employments" on public.payments
  for select to authenticated
  using (exists (
    select 1 from public.employments e
    where e.id = payments.employment_id
      and (e.employer_id = (select auth.uid()) or e.worker_user_id = (select auth.uid()))
  ));
create policy "Employer: create payments" on public.payments
  for insert to authenticated
  with check (
    worker_confirmed_at is null
    and exists (select 1 from public.employments e where e.id = payments.employment_id and e.employer_id = (select auth.uid()))
  );
create policy "Employer: update payments" on public.payments
  for update to authenticated
  using (exists (select 1 from public.employments e where e.id = payments.employment_id and e.employer_id = (select auth.uid())))
  with check (exists (select 1 from public.employments e where e.id = payments.employment_id and e.employer_id = (select auth.uid())));
create policy "Employer: delete payments" on public.payments
  for delete to authenticated
  using (exists (select 1 from public.employments e where e.id = payments.employment_id and e.employer_id = (select auth.uid())));

-- ============================================================ Tamper guards

-- Employers can't change who is linked, or fake the worker's confirmation.
create or replace function public.guard_employment_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.worker_user_id is distinct from old.worker_user_id
     and current_setting('cero.claiming', true) is distinct from 'on' then
    raise exception 'worker_user_id can only be set by the worker';
  end if;
  return new;
end;
$$;
create trigger employments_guard before update on public.employments
  for each row execute function public.guard_employment_update();

create or replace function public.guard_payment_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.worker_confirmed_at is distinct from old.worker_confirmed_at
     and current_setting('cero.confirming', true) is distinct from 'on' then
    raise exception 'worker_confirmed_at can only be set by the worker';
  end if;
  if old.worker_confirmed_at is not null
     and current_setting('cero.confirming', true) is distinct from 'on' then
    raise exception 'a payment confirmed by the worker can no longer be edited';
  end if;
  return new;
end;
$$;
create trigger payments_guard before update on public.payments
  for each row execute function public.guard_payment_update();

-- ============================================================ App functions (RPC)

-- A worker links her account to an employment with the invite code.
create or replace function public.claim_employment(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  emp_id uuid;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'worker') then
    raise exception 'Solo una cuenta de trabajadora puede usar un código';
  end if;
  select e.id into emp_id from public.employments e
   where e.invite_code = upper(trim(code)) and e.worker_user_id is null
   for update;
  if emp_id is null then
    raise exception 'Código no válido o ya usado';
  end if;
  perform set_config('cero.claiming', 'on', true);
  update public.employments set worker_user_id = auth.uid() where id = emp_id;
  perform set_config('cero.claiming', 'off', true);
  return emp_id;
end;
$$;

-- A worker confirms she received a payment.
create or replace function public.confirm_payment(payment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.payments pa join public.employments e on e.id = pa.employment_id
     where pa.id = payment_id and e.worker_user_id = auth.uid()
  ) then
    raise exception 'Pago no encontrado';
  end if;
  perform set_config('cero.confirming', 'on', true);
  update public.payments set worker_confirmed_at = now() where id = payment_id and worker_confirmed_at is null;
  perform set_config('cero.confirming', 'off', true);
end;
$$;

revoke execute on function public.claim_employment(text) from public, anon;
revoke execute on function public.confirm_payment(uuid) from public, anon;
grant execute on function public.claim_employment(text) to authenticated;
grant execute on function public.confirm_payment(uuid) to authenticated;

-- =============================================================================
-- LOCAL ONLY — minimal stand-in for the Supabase platform objects the
-- migrations depend on, so they and supabase/tests/*.sql can run on a plain
-- PostgreSQL 15+ database. NEVER run this on Supabase (the real objects exist).
--
--   createdb qalbi_test
--   psql -d qalbi_test -v ON_ERROR_STOP=1 -f supabase/tests/local_supabase_shim.sql
--   psql -d qalbi_test -v ON_ERROR_STOP=1 -f supabase/migrations/<each file, in order>
--   psql -d qalbi_test -v ON_ERROR_STOP=1 -f supabase/tests/<test>.sql
-- =============================================================================

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant anon, authenticated, service_role to current_user;
grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
create table if not exists auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Same resolution order as Supabase: the sub claim from the verified JWT.
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;

create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;
create table if not exists storage.buckets (id text primary key, name text, public boolean default false);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated;
insert into storage.buckets (id, name, public) values ('qalbi-naturals-media', 'qalbi-naturals-media', true) on conflict do nothing;

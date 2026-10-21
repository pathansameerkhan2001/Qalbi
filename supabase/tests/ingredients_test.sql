-- =============================================================================
-- LOCAL ONLY — tests for migrations/20261021000000_ingredients.sql.
-- Run against a LOCAL database with all migrations applied (never production):
--   psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/ingredients_test.sql
-- Runs in one transaction that is rolled back; raises at the end on any FAIL.
-- =============================================================================
begin;

create temporary table results (n serial, name text, ok boolean, detail text);
grant all on results to public;
grant usage on sequence results_n_seq to public;

create function pg_temp.check(name text, ok boolean, detail text default '') returns void language sql as
$$ insert into results (name, ok, detail) values (name, coalesce(ok, false), detail); $$;
create function pg_temp.denied(name text, stmt text) returns void language plpgsql as $$
begin
  begin execute stmt; exception when others then perform pg_temp.check(name, true, sqlerrm); return; end;
  perform pg_temp.check(name, false, 'statement succeeded');
end $$;
create function pg_temp.allowed(name text, stmt text) returns void language plpgsql as $$
begin
  execute stmt; perform pg_temp.check(name, true);
exception when others then perform pg_temp.check(name, false, sqlerrm);
end $$;
create function pg_temp.no_rows(name text, stmt text) returns void language plpgsql as $$
declare n integer;
begin
  execute stmt; get diagnostics n = row_count; perform pg_temp.check(name, n = 0, n || ' rows affected');
exception when others then perform pg_temp.check(name, true, sqlerrm);
end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;
create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  execute 'set local role authenticated';
end $$;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000a001', 'admin@test.local', now()),
  ('00000000-0000-0000-0000-00000000c001', 'customer@test.local', now());
insert into public.admin_users (user_id, email) values ('00000000-0000-0000-0000-00000000a001', 'admin@test.local');

-- ---------------------------------------------------------------------------
-- 1. Administrator
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
select pg_temp.allowed('admin: add active ingredient with photo',
  $$insert into public.ingredients (slug, name, description, image_path, image_alt, icon, product_handles, sort_order, is_active)
    values ('saffron', 'Saffron', 'Prized stigmas of the crocus flower.', 'uploads/ingredients/saffron.webp', 'Saffron threads', 'saffron', '{radiance-glow-cream}', 1, true)$$);
select pg_temp.allowed('admin: add hidden ingredient without photo',
  $$insert into public.ingredients (slug, name, description, icon) values ('neem', 'Neem', 'Neem leaves.', 'neem')$$);
select pg_temp.denied('admin: photo without alt text rejected',
  $$insert into public.ingredients (slug, name, description, image_path) values ('rose', 'Rose', 'Rose petals.', 'uploads/r.webp')$$);
select pg_temp.denied('admin: unknown icon rejected',
  $$insert into public.ingredients (slug, name, description, icon) values ('x', 'X', 'X', 'skull')$$);
select pg_temp.denied('admin: bad slug rejected',
  $$insert into public.ingredients (slug, name, description) values ('Bad Slug', 'X', 'X')$$);
select pg_temp.denied('admin: path traversal rejected',
  $$insert into public.ingredients (slug, name, description, image_path, image_alt) values ('y', 'Y', 'Y', 'uploads/../secret', 'Y')$$);
select pg_temp.denied('admin: duplicate slug rejected',
  $$insert into public.ingredients (slug, name, description) values ('saffron', 'Saffron 2', 'Dup')$$);

-- ---------------------------------------------------------------------------
-- 2. Visitor
-- ---------------------------------------------------------------------------
select pg_temp.as_anon();
select pg_temp.check('anon: sees active ingredient only', (select count(*) = 1 from public.ingredients));
select pg_temp.denied('anon: cannot add ingredient', $$insert into public.ingredients (slug, name, description) values ('spam', 'Spam', 'Spam')$$);
select pg_temp.no_rows('anon: cannot edit ingredients', $$update public.ingredients set name = 'Hacked'$$);

-- ---------------------------------------------------------------------------
-- 3. Signed-in non-admin
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000c001');
select pg_temp.check('user: sees active ingredient only', (select count(*) = 1 from public.ingredients));
select pg_temp.denied('user: cannot add ingredient', $$insert into public.ingredients (slug, name, description) values ('spam', 'Spam', 'Spam')$$);
select pg_temp.no_rows('user: cannot edit ingredients', $$update public.ingredients set is_active = true$$);
select pg_temp.no_rows('user: cannot delete ingredients', $$delete from public.ingredients$$);

-- ---------------------------------------------------------------------------
reset role;
select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail from results order by n;
do $$
declare failed integer := (select count(*) from results where not ok);
begin
  if failed > 0 then raise exception '% test(s) failed', failed; end if;
  raise notice 'All % tests passed', (select count(*) from results);
end $$;

rollback;

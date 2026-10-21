-- =============================================================================
-- LOCAL ONLY — catalogue and content visibility across all migrations.
-- Run against a LOCAL database with all migrations applied (never production):
--   psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/catalogue_visibility_test.sql
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
-- 0. Existing data preserved by the later migrations (skipped on an empty DB)
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.check('preserved: existing product keeps price, compare-at, stock, slug and image',
  not exists (select 1 from public.products where slug = 'test')
  or exists (select 1 from public.products p join public.product_images i on i.product_id = p.id
              where p.slug = 'test' and p.price = 55 and p.compare_at_price = 99.55 and p.stock_quantity = 0
                and i.image_url = 'uploads/products/cloudxfn-photoroom-75509e56.png' and i.is_primary));
-- Visibility counts below are relative to whatever was already published.
create temporary table baseline as select (select count(*) from public.products where is_published) as published;
grant select on baseline to public;

-- ---------------------------------------------------------------------------
-- 1. Administrator: product lifecycle
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
select pg_temp.allowed('admin: create category',
  $$insert into public.categories (id, name, slug) values ('00000000-0000-0000-0000-0000000ca001', 'Serums', 'serums')$$);
select pg_temp.allowed('admin: create draft product',
  $$insert into public.products (id, category_id, name, slug, price, stock_quantity)
    values ('00000000-0000-0000-0000-0000000b0001', '00000000-0000-0000-0000-0000000ca001', 'Booster Serum', 'booster-serum', 0, 0)$$);
select pg_temp.allowed('admin: add product image',
  $$insert into public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
    values ('00000000-0000-0000-0000-0000000b0001', 'uploads/products/serum.webp', 'Serum', 0, true)$$);
select pg_temp.denied('admin: second primary image rejected',
  $$insert into public.product_images (product_id, image_url, is_primary) values ('00000000-0000-0000-0000-0000000b0001', 'uploads/products/b.webp', true)$$);
select pg_temp.denied('admin: negative price rejected', $$update public.products set price = -1 where slug = 'booster-serum'$$);
select pg_temp.denied('admin: negative stock rejected', $$update public.products set stock_quantity = -1 where slug = 'booster-serum'$$);
select pg_temp.denied('admin: compare-at below price rejected', $$update public.products set price = 500, compare_at_price = 400 where slug = 'booster-serum'$$);
select pg_temp.denied('admin: duplicate slug rejected', $$insert into public.products (name, slug, price) values ('Dup', 'booster-serum', 1)$$);
select pg_temp.allowed('admin: edit price and stock', $$update public.products set price = 897, stock_quantity = 10 where slug = 'booster-serum'$$);
select pg_temp.check('admin: edit persisted', (select price = 897 and stock_quantity = 10 from public.products where slug = 'booster-serum'));

-- Draft: invisible to visitors
select pg_temp.as_anon();
select pg_temp.check('anon: draft product hidden', not exists (select 1 from public.products where slug = 'booster-serum'));
select pg_temp.check('anon: draft product images hidden', not exists (select 1 from public.product_images where product_id = '00000000-0000-0000-0000-0000000b0001'));

-- Publish
select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
select pg_temp.allowed('admin: publish product', $$update public.products set is_published = true where slug = 'booster-serum'$$);
select pg_temp.as_anon();
select pg_temp.check('anon: published product visible by slug', exists (select 1 from public.products where slug = 'booster-serum' and price = 897));
select pg_temp.check('anon: published product image visible', exists (select 1 from public.product_images where product_id = '00000000-0000-0000-0000-0000000b0001'));
select pg_temp.check('anon: active category visible', exists (select 1 from public.categories where slug = 'serums'));
select pg_temp.check('anon: sees exactly one more published product',
  (select count(*) from public.products) = (select published from baseline) + 1);

-- Unpublish
select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
select pg_temp.allowed('admin: unpublish product', $$update public.products set is_published = false where slug = 'booster-serum'$$);
select pg_temp.allowed('admin: hide category', $$update public.categories set is_active = false where slug = 'serums'$$);
select pg_temp.as_anon();
select pg_temp.check('anon: unpublished product hidden again', not exists (select 1 from public.products where slug = 'booster-serum'));
select pg_temp.check('anon: hidden category hidden', not exists (select 1 from public.categories where slug = 'serums'));

-- ---------------------------------------------------------------------------
-- 2. Content publish / unpublish flips (hero, reels, blog)
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
select pg_temp.allowed('admin: add hidden hero slide',
  $$insert into public.hero_slides (id, desktop_image_path, mobile_image_path, alt_text) values ('00000000-0000-0000-0000-0000000e0001', 'uploads/hero/d.webp', 'uploads/hero/m.webp', 'Hero')$$);
select pg_temp.allowed('admin: add hidden reel',
  $$insert into public.instagram_reels (id, reel_url, caption, thumbnail_path) values ('00000000-0000-0000-0000-0000000f0001', 'https://www.instagram.com/reel/ABCDE12345/', 'Ritual', 'uploads/reels/t.webp')$$);
select pg_temp.allowed('admin: add draft post',
  $$insert into public.blog_posts (id, slug, title) values ('00000000-0000-0000-0000-0000000d0001', 'first-post', 'First post')$$);
select pg_temp.as_anon();
select pg_temp.check('anon: hidden hero, reel and draft post invisible',
  not exists (select 1 from public.hero_slides where id = '00000000-0000-0000-0000-0000000e0001')
  and not exists (select 1 from public.instagram_reels where id = '00000000-0000-0000-0000-0000000f0001')
  and not exists (select 1 from public.blog_posts where id = '00000000-0000-0000-0000-0000000d0001'));

select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
select pg_temp.allowed('admin: publish hero slide', $$update public.hero_slides set is_active = true where id = '00000000-0000-0000-0000-0000000e0001'$$);
select pg_temp.allowed('admin: publish reel', $$update public.instagram_reels set is_published = true where id = '00000000-0000-0000-0000-0000000f0001'$$);
select pg_temp.allowed('admin: publish post',
  $$update public.blog_posts set status = 'published', published_at = now() - interval '1 minute', excerpt = 'Intro', body = 'Text',
           cover_image_path = 'uploads/blog/c.webp' where id = '00000000-0000-0000-0000-0000000d0001'$$);
select pg_temp.as_anon();
select pg_temp.check('anon: published hero visible', exists (select 1 from public.hero_slides where id = '00000000-0000-0000-0000-0000000e0001'));
select pg_temp.check('anon: published reel visible', exists (select 1 from public.instagram_reels where id = '00000000-0000-0000-0000-0000000f0001'));
select pg_temp.check('anon: published post visible by slug', exists (select 1 from public.blog_posts where slug = 'first-post'));

select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
select pg_temp.allowed('admin: unpublish post (back to draft)', $$update public.blog_posts set status = 'draft' where slug = 'first-post'$$);
select pg_temp.allowed('admin: hide hero slide', $$update public.hero_slides set is_active = false where id = '00000000-0000-0000-0000-0000000e0001'$$);
select pg_temp.allowed('admin: hide reel', $$update public.instagram_reels set is_published = false where id = '00000000-0000-0000-0000-0000000f0001'$$);
select pg_temp.as_anon();
select pg_temp.check('anon: unpublished post hidden again', not exists (select 1 from public.blog_posts where slug = 'first-post'));
select pg_temp.check('anon: hidden hero hidden again', not exists (select 1 from public.hero_slides where id = '00000000-0000-0000-0000-0000000e0001'));
select pg_temp.check('anon: hidden reel hidden again', not exists (select 1 from public.instagram_reels where id = '00000000-0000-0000-0000-0000000f0001'));

-- ---------------------------------------------------------------------------
-- 3. Non-administrators cannot write the catalogue or content
-- ---------------------------------------------------------------------------
select pg_temp.as_anon();
select pg_temp.denied('anon: cannot create product', $$insert into public.products (name, slug, price) values ('Hack', 'hack', 1)$$);
select pg_temp.no_rows('anon: cannot change prices', $$update public.products set price = 1$$);
select pg_temp.denied('anon: cannot add product images', $$insert into public.product_images (product_id, image_url) values ('00000000-0000-0000-0000-0000000b0001', 'x.webp')$$);
select pg_temp.as_user('00000000-0000-0000-0000-00000000c001');
select pg_temp.denied('user: cannot create product', $$insert into public.products (name, slug, price) values ('Hack', 'hack', 1)$$);
select pg_temp.no_rows('user: cannot change prices', $$update public.products set price = 1$$);
select pg_temp.no_rows('user: cannot publish drafts', $$update public.products set is_published = true$$);
select pg_temp.no_rows('user: cannot delete products', $$delete from public.products$$);
select pg_temp.no_rows('user: cannot delete product images', $$delete from public.product_images$$);
select pg_temp.denied('user: cannot create category', $$insert into public.categories (name, slug) values ('Spam', 'spam')$$);
select pg_temp.denied('user: cannot add hero slide', $$insert into public.hero_slides (desktop_image_path, mobile_image_path, alt_text) values ('a.webp', 'b.webp', 'x')$$);
select pg_temp.no_rows('user: cannot publish posts', $$update public.blog_posts set status = 'published'$$);

-- ---------------------------------------------------------------------------
-- 4. Administrator: delete
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
select pg_temp.allowed('admin: delete product (images cascade)', $$delete from public.products where slug = 'booster-serum'$$);
select pg_temp.check('admin: product images removed with product', not exists (select 1 from public.product_images where product_id = '00000000-0000-0000-0000-0000000b0001'));
select pg_temp.allowed('admin: delete post', $$delete from public.blog_posts where slug = 'first-post'$$);

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

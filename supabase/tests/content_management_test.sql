-- =============================================================================
-- LOCAL ONLY — tests for migrations/20261019000000_content_management.sql.
-- Run against a LOCAL database with both migrations applied (never production):
--   psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/content_management_test.sql
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
select pg_temp.allowed('admin: add active hero slide with button',
  $$insert into public.hero_slides (heading, button_label, button_href, desktop_image_path, mobile_image_path, alt_text, sort_order, is_active)
    values ('Heading', 'Shop now', '/products', 'uploads/hero/d.webp', 'uploads/hero/m.webp', 'Alt', 1, true)$$);
select pg_temp.allowed('admin: add hidden hero slide',
  $$insert into public.hero_slides (desktop_image_path, mobile_image_path, alt_text) values ('uploads/hero/d2.webp', 'uploads/hero/m2.webp', 'Alt 2')$$);
select pg_temp.denied('admin: button label without destination rejected',
  $$insert into public.hero_slides (button_label, desktop_image_path, mobile_image_path, alt_text) values ('Shop', 'a.webp', 'b.webp', 'x')$$);
select pg_temp.denied('admin: javascript: button link rejected',
  $$insert into public.hero_slides (button_label, button_href, desktop_image_path, mobile_image_path, alt_text) values ('x', 'javascript:alert(1)', 'a.webp', 'b.webp', 'x')$$);
select pg_temp.denied('admin: protocol-relative button link rejected',
  $$insert into public.hero_slides (button_label, button_href, desktop_image_path, mobile_image_path, alt_text) values ('x', '//evil.example', 'a.webp', 'b.webp', 'x')$$);
select pg_temp.denied('admin: path traversal in image path rejected',
  $$insert into public.hero_slides (desktop_image_path, mobile_image_path, alt_text) values ('uploads/../x.webp', 'b.webp', 'x')$$);
select pg_temp.denied('admin: external image URL rejected',
  $$insert into public.hero_slides (desktop_image_path, mobile_image_path, alt_text) values ('https://evil.example/x.webp', 'b.webp', 'x')$$);

select pg_temp.allowed('admin: add published reel',
  $$insert into public.instagram_reels (reel_url, caption, thumbnail_path, is_published) values ('https://www.instagram.com/reel/AbC_12-3/', 'Morning ritual', 'uploads/reels/t.webp', true)$$);
select pg_temp.allowed('admin: add hidden reel',
  $$insert into public.instagram_reels (reel_url, caption, thumbnail_path) values ('https://www.instagram.com/p/XyZ12345/', 'Hidden', 'uploads/reels/t2.webp')$$);
select pg_temp.denied('admin: non-Instagram reel URL rejected',
  $$insert into public.instagram_reels (reel_url, caption, thumbnail_path) values ('https://evil.example/reel/AbCdE/', 'x', 't.webp')$$);
select pg_temp.denied('admin: duplicate reel URL rejected',
  $$insert into public.instagram_reels (reel_url, caption, thumbnail_path) values ('https://www.instagram.com/reel/AbC_12-3/', 'x', 't.webp')$$);

select pg_temp.allowed('admin: save draft post without cover',
  $$insert into public.blog_posts (slug, title) values ('draft-post', 'Draft')$$);
select pg_temp.denied('admin: publishing without cover image rejected',
  $$update public.blog_posts set status = 'published', published_at = now(), excerpt = 'e', body = 'b' where slug = 'draft-post'$$);
select pg_temp.allowed('admin: publish complete post',
  $$insert into public.blog_posts (slug, title, excerpt, body, cover_image_path, status, published_at)
    values ('live-post', 'Live', 'Excerpt', 'Body', 'uploads/blog/c.webp', 'published', now() - interval '1 minute')$$);
select pg_temp.allowed('admin: schedule post for the future',
  $$insert into public.blog_posts (slug, title, excerpt, body, cover_image_path, status, published_at)
    values ('future-post', 'Future', 'Excerpt', 'Body', 'uploads/blog/c.webp', 'published', now() + interval '1 day')$$);
select pg_temp.denied('admin: duplicate slug rejected', $$insert into public.blog_posts (slug, title) values ('live-post', 'Dup')$$);
select pg_temp.denied('admin: invalid slug rejected', $$insert into public.blog_posts (slug, title) values ('Bad Slug!', 'x')$$);
select pg_temp.check('admin: sees drafts and scheduled posts', (select count(*) = 3 from public.blog_posts));

select pg_temp.allowed('admin: product SEO fields',
  $$insert into public.products (name, slug, price, seo_title, seo_description) values ('P', 'p', 10, 'SEO title', 'SEO description')$$);
select pg_temp.allowed('admin: save offer_bar setting',
  $$insert into public.store_settings (setting_key, setting_value) values ('offer_bar', '{"enabled": true, "animate": false, "messages": []}')$$);
select pg_temp.allowed('admin: save homepage_sections setting',
  $$insert into public.store_settings (setting_key, setting_value) values ('homepage_sections', '{"sections": []}')$$);
select pg_temp.allowed('admin: save brand_claims setting',
  $$insert into public.store_settings (setting_key, setting_value) values ('brand_claims', '{"verified": false}')$$);
select pg_temp.allowed('admin: delete hidden reel', $$delete from public.instagram_reels where caption = 'Hidden'$$);
select pg_temp.denied('admin: cannot truncate blog posts', $$truncate public.blog_posts$$);

-- ---------------------------------------------------------------------------
-- 2. Anonymous visitor
-- ---------------------------------------------------------------------------
select pg_temp.as_anon();
select pg_temp.check('anon: sees active hero slide only', (select count(*) = 1 from public.hero_slides));
select pg_temp.check('anon: sees published reel only', (select count(*) = 1 from public.instagram_reels));
select pg_temp.check('anon: sees live post only (no draft, no scheduled)', (select array_agg(slug) = array['live-post'] from public.blog_posts));
select pg_temp.check('anon: reads offer_bar and homepage_sections', (select count(*) = 2 from public.store_settings where setting_key in ('offer_bar', 'homepage_sections')));
select pg_temp.check('anon: still reads checkout', (select count(*) = 1 from public.store_settings where setting_key = 'checkout'));
select pg_temp.check('anon: still cannot read brand_claims', (select count(*) = 0 from public.store_settings where setting_key = 'brand_claims'));
select pg_temp.denied('anon: cannot add hero slide', $$insert into public.hero_slides (desktop_image_path, mobile_image_path, alt_text) values ('a.webp', 'b.webp', 'x')$$);
select pg_temp.denied('anon: cannot add reel', $$insert into public.instagram_reels (reel_url, caption, thumbnail_path) values ('https://www.instagram.com/reel/ZZZZZ/', 'x', 't.webp')$$);
select pg_temp.denied('anon: cannot add post', $$insert into public.blog_posts (slug, title) values ('spam', 'Spam')$$);
select pg_temp.denied('anon: cannot unpublish post', $$update public.blog_posts set status = 'draft'$$);
select pg_temp.denied('anon: cannot delete reels', $$delete from public.instagram_reels$$);

-- ---------------------------------------------------------------------------
-- 3. Signed-in non-admin
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000c001');
select pg_temp.check('user: sees active hero slide only', (select count(*) = 1 from public.hero_slides));
select pg_temp.check('user: sees live post only', (select count(*) = 1 from public.blog_posts));
select pg_temp.denied('user: cannot add hero slide', $$insert into public.hero_slides (desktop_image_path, mobile_image_path, alt_text) values ('a.webp', 'b.webp', 'x')$$);
select pg_temp.denied('user: cannot add post', $$insert into public.blog_posts (slug, title) values ('spam', 'Spam')$$);
select pg_temp.no_rows('user: cannot edit posts', $$update public.blog_posts set title = 'Hacked'$$);
select pg_temp.no_rows('user: cannot delete posts', $$delete from public.blog_posts$$);
select pg_temp.no_rows('user: cannot hide hero slides', $$update public.hero_slides set is_active = false$$);
select pg_temp.no_rows('user: cannot delete reels', $$delete from public.instagram_reels$$);
select pg_temp.no_rows('user: cannot change offer bar', $$update public.store_settings set setting_value = '{}' where setting_key = 'offer_bar'$$);

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

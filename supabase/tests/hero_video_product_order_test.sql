-- =============================================================================
-- LOCAL ONLY — tests for migrations/20261026000000_hero_video_and_product_order.sql.
-- Run against a LOCAL database with all migrations applied (never production):
--   psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/hero_video_product_order_test.sql
-- Runs in one transaction that is rolled back; raises at the end on any FAIL.
-- Constraints only (no RLS here: the migration adds no policy or grant).
-- =============================================================================
begin;

create temporary table results (n serial, name text, ok boolean, detail text);

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

-- Hero slides --------------------------------------------------------------
select pg_temp.allowed('image slide with both images',
  $$insert into public.hero_slides (desktop_image_path, mobile_image_path, alt_text) values ('uploads/hero/d.webp', 'uploads/hero/m.webp', 'image')$$);
select pg_temp.check('existing/default rows are image slides',
  (select media_type = 'image' from public.hero_slides where alt_text = 'image'));
select pg_temp.denied('image slide without a mobile image',
  $$insert into public.hero_slides (desktop_image_path, alt_text) values ('uploads/hero/d.webp', 'x')$$);
select pg_temp.denied('image slide with a video path',
  $$insert into public.hero_slides (desktop_image_path, mobile_image_path, desktop_video_path, alt_text) values ('uploads/hero/d.webp', 'uploads/hero/m.webp', 'uploads/hero/videos/v.mp4', 'x')$$);
select pg_temp.allowed('video slide without posters or a mobile video',
  $$insert into public.hero_slides (media_type, desktop_video_path, alt_text) values ('video', 'uploads/hero/videos/v.mp4', 'video')$$);
select pg_temp.allowed('video slide with both videos and posters',
  $$insert into public.hero_slides (media_type, desktop_video_path, mobile_video_path, desktop_image_path, mobile_image_path, alt_text)
    values ('video', 'hero/qalbi-naturals-hero-v2-desktop.mp4', 'hero/qalbi-naturals-hero-v2-mobile.mp4', 'uploads/hero/p.webp', 'uploads/hero/pm.webp', 'video 2')$$);
select pg_temp.denied('video slide without a desktop video',
  $$insert into public.hero_slides (media_type, mobile_video_path, alt_text) values ('video', 'uploads/hero/videos/v.mp4', 'x')$$);
select pg_temp.denied('video slide with only a mobile poster',
  $$insert into public.hero_slides (media_type, desktop_video_path, mobile_image_path, alt_text) values ('video', 'uploads/hero/videos/v.mp4', 'uploads/hero/pm.webp', 'x')$$);
select pg_temp.denied('video path must be .mp4 / .webm',
  $$insert into public.hero_slides (media_type, desktop_video_path, alt_text) values ('video', 'uploads/hero/videos/v.mov', 'x')$$);
select pg_temp.denied('video path may not climb out of the bucket',
  $$insert into public.hero_slides (media_type, desktop_video_path, alt_text) values ('video', 'uploads/../v.mp4', 'x')$$);
select pg_temp.denied('unknown media type',
  $$insert into public.hero_slides (media_type, desktop_video_path, alt_text) values ('gif', 'uploads/hero/videos/v.mp4', 'x')$$);

-- Products -------------------------------------------------------------------
select pg_temp.check('products.sort_order exists, not null, default 0',
  (select is_nullable = 'NO' and column_default = '0' from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'sort_order'));
select pg_temp.check('existing products numbered 10, 20, 30… in the old storefront order (featured first, then name)',
  (select coalesce(bool_and(sort_order = n * 10), true)
     from (select sort_order, row_number() over (order by is_featured desc, name) as n from public.products) o));

-- Report ---------------------------------------------------------------------
select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail from results order by n;
do $$ begin
  if exists (select 1 from results where not ok) then raise exception 'hero_video_product_order_test: % failure(s)', (select count(*) from results where not ok); end if;
end $$;

rollback;

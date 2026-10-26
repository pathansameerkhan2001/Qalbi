-- =============================================================================
-- QALBI Naturals — hero video slides and manual product order
--
-- Adds
--   • hero_slides.media_type ('image' | 'video', existing rows: 'image')
--   • hero_slides.desktop_video_path / mobile_video_path (objects in the media bucket)
--     For video slides desktop_image_path / mobile_image_path are the optional
--     posters, so both become nullable; image slides still require both images.
--   • products.sort_order — one global manual order (the storefront's default
--     "Featured" sort and every category page follow it). Existing products are
--     numbered 10, 20, 30… in the order the website shows them today (featured
--     first, then by name), so nothing moves until an administrator reorders.
--
-- What it does NOT change
--   • No row is deleted; no price, stock, description or other product data is
--     touched. No storage bucket, storage policy, RLS policy or grant changes:
--     the existing ones already cover the new columns.
--
-- Plain ADD COLUMNs: if it was already applied the script stops and rolls back.
-- Run as ONE script in Supabase → SQL Editor (project pcvzyjhlruricsanzuao),
-- after 20261018000000, 20261019000000 and 20261021000000.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Hero slides: images or videos
-- ---------------------------------------------------------------------------
alter table public.hero_slides
  add column media_type text not null default 'image' check (media_type in ('image', 'video')),
  add column desktop_video_path text check (char_length(desktop_video_path) <= 300 and desktop_video_path ~ '^[a-z0-9][a-z0-9/_.-]*\.(mp4|webm)$' and desktop_video_path !~ '\.\.'),
  add column mobile_video_path text check (char_length(mobile_video_path) <= 300 and mobile_video_path ~ '^[a-z0-9][a-z0-9/_.-]*\.(mp4|webm)$' and mobile_video_path !~ '\.\.');

alter table public.hero_slides
  alter column desktop_image_path drop not null,
  alter column mobile_image_path drop not null;

alter table public.hero_slides
  add constraint hero_slides_media_check check (
    case media_type
      when 'image' then desktop_image_path is not null and mobile_image_path is not null and desktop_video_path is null and mobile_video_path is null
      -- A mobile video is optional (phones then get the desktop one); a mobile poster needs a desktop poster.
      else desktop_video_path is not null and (mobile_image_path is null or desktop_image_path is not null)
    end
  );

-- ---------------------------------------------------------------------------
-- 2. Products: manual order
-- ---------------------------------------------------------------------------
alter table public.products add column sort_order integer not null default 0;

update public.products p
   set sort_order = o.n * 10
  from (select id, row_number() over (order by is_featured desc, name) as n from public.products) o
 where o.id = p.id;

create index products_sort_idx on public.products (sort_order, name);

commit;

-- -----------------------------------------------------------------------------
-- Checks (read-only) after running:
-- select column_name, is_nullable from information_schema.columns
--  where table_schema = 'public' and table_name = 'hero_slides'
--    and column_name in ('media_type', 'desktop_video_path', 'mobile_video_path', 'desktop_image_path', 'mobile_image_path');
--                                                       -- expect 5 rows; all but media_type nullable
-- select name, sort_order from public.products order by sort_order, name;   -- 10, 20, 30…
-- -----------------------------------------------------------------------------

-- =============================================================================
-- QALBI Naturals — CONTENT MANAGEMENT (run after 20261018000000_initial_schema.sql)
--
-- What it creates / changes
--   • hero_slides      — homepage hero slides (images in qalbi-naturals-media)
--   • instagram_reels  — manually curated Reel links with uploaded thumbnails
--   • blog_posts       — the QALBI Journal (draft / published)
--   • products         — two optional SEO columns: seo_title, seo_description
--   • store_settings   — visitors may also read the 'offer_bar' and
--                        'homepage_sections' keys (policy replaced, same rules)
--
-- Security model (same as the initial migration)
--   • RLS on every new table. Visitors read only active / published rows.
--   • Writes only for administrators verified by public.is_admin().
--   • Explicit least-privilege grants; no TRUNCATE; no function grants added.
--
-- What it does NOT change
--   • No existing row, no storage bucket, no storage policy, no order/checkout
--     function, no admin. No sample content is inserted.
--
-- Plain CREATEs: if anything already exists the script stops and rolls back.
-- Run as ONE script in Supabase → SQL Editor (project pcvzyjhlruricsanzuao).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Hero slides
-- ---------------------------------------------------------------------------
create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  heading text check (char_length(heading) between 1 and 90),
  subtitle text check (char_length(subtitle) between 1 and 200),
  button_label text check (char_length(button_label) between 1 and 40),
  -- Internal path (/products) or an https URL.
  button_href text check (char_length(button_href) <= 300 and button_href ~ '^(/([^/\s][^\s]*)?|https://[^\s]+)$'),
  desktop_image_path text not null check (char_length(desktop_image_path) <= 300 and desktop_image_path ~ '^[a-z0-9][a-z0-9/_.-]*$' and desktop_image_path !~ '\.\.'),
  mobile_image_path text not null check (char_length(mobile_image_path) <= 300 and mobile_image_path ~ '^[a-z0-9][a-z0-9/_.-]*$' and mobile_image_path !~ '\.\.'),
  alt_text text not null check (char_length(alt_text) between 1 and 200),
  sort_order integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A button needs both a label and a destination.
  check ((button_label is null) = (button_href is null))
);
create index hero_slides_order_idx on public.hero_slides (sort_order, created_at);

-- ---------------------------------------------------------------------------
-- 2. Instagram Reels (manual curation; no credentials are stored)
-- ---------------------------------------------------------------------------
create table public.instagram_reels (
  id uuid primary key default gen_random_uuid(),
  -- Normalised by the website to https://www.instagram.com/reel/<code>/ (or /p/<code>/).
  reel_url text not null unique check (reel_url ~ '^https://www\.instagram\.com/(reel|p)/[A-Za-z0-9_-]{5,64}/$'),
  caption text not null check (char_length(caption) between 1 and 80),
  thumbnail_path text not null check (char_length(thumbnail_path) <= 300 and thumbnail_path ~ '^[a-z0-9][a-z0-9/_.-]*$' and thumbnail_path !~ '\.\.'),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index instagram_reels_order_idx on public.instagram_reels (sort_order, created_at);

-- ---------------------------------------------------------------------------
-- 3. Blog posts (the QALBI Journal)
--    body is plain text with a tiny markup (## heading, - list item, blank
--    line = new paragraph). The website renders it as text — never as HTML.
-- ---------------------------------------------------------------------------
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) <= 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 140),
  excerpt text not null default '' check (char_length(excerpt) <= 320),
  body text not null default '' check (char_length(body) <= 50000),
  category text check (char_length(category) between 1 and 40),
  author text check (char_length(author) between 1 and 80),
  cover_image_path text check (char_length(cover_image_path) <= 300 and cover_image_path ~ '^[a-z0-9][a-z0-9/_.-]*$' and cover_image_path !~ '\.\.'),
  cover_alt text check (char_length(cover_alt) <= 200),
  seo_title text check (char_length(seo_title) <= 120),
  seo_description text check (char_length(seo_description) <= 320),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A published post always has a date, a cover image, an excerpt and a body.
  check (status = 'draft' or (published_at is not null and cover_image_path is not null
                             and char_length(excerpt) > 0 and char_length(body) > 0))
);
create index blog_posts_published_idx on public.blog_posts (status, published_at desc);

-- ---------------------------------------------------------------------------
-- 4. Product SEO (optional; the website falls back to name / description)
-- ---------------------------------------------------------------------------
alter table public.products
  add column seo_title text check (char_length(seo_title) <= 120),
  add column seo_description text check (char_length(seo_description) <= 320);

-- ---------------------------------------------------------------------------
-- 5. updated_at triggers (reuse the existing trigger function)
-- ---------------------------------------------------------------------------
create trigger hero_slides_touch before update on public.hero_slides
  for each row execute function public.touch_updated_at();
create trigger instagram_reels_touch before update on public.instagram_reels
  for each row execute function public.touch_updated_at();
create trigger blog_posts_touch before update on public.blog_posts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Row level security
-- ---------------------------------------------------------------------------
alter table public.hero_slides enable row level security;
alter table public.instagram_reels enable row level security;
alter table public.blog_posts enable row level security;

create policy "hero_slides: public read active" on public.hero_slides
  for select to anon, authenticated using (is_active);
create policy "hero_slides: admin write" on public.hero_slides
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "instagram_reels: public read published" on public.instagram_reels
  for select to anon, authenticated using (is_published);
create policy "instagram_reels: admin write" on public.instagram_reels
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Scheduled posts (published_at in the future) stay hidden until that time.
create policy "blog_posts: public read published" on public.blog_posts
  for select to anon, authenticated using (status = 'published' and published_at <= now());
create policy "blog_posts: admin write" on public.blog_posts
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Storefront settings readable by visitors: the original 7 keys plus offer_bar
-- and homepage_sections. brand_claims and any other key stay admin-only.
drop policy "store_settings: public read storefront keys" on public.store_settings;
create policy "store_settings: public read storefront keys" on public.store_settings
  for select to anon, authenticated
  using (setting_key = any (array['checkout', 'contact', 'announcements', 'hero', 'instagram_reels', 'trust_badges', 'featured',
                                  'offer_bar', 'homepage_sections']));

-- ---------------------------------------------------------------------------
-- 7. Privileges (least privilege; RLS applies on top)
-- ---------------------------------------------------------------------------
revoke all on public.hero_slides, public.instagram_reels, public.blog_posts from anon, authenticated;
grant select on public.hero_slides, public.instagram_reels, public.blog_posts to anon, authenticated;
grant insert, update, delete on public.hero_slides, public.instagram_reels, public.blog_posts to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- Read-only verification after commit
-- ---------------------------------------------------------------------------
-- select tablename, policyname, cmd from pg_policies
--  where schemaname = 'public' and tablename in ('hero_slides', 'instagram_reels', 'blog_posts', 'store_settings')
--  order by 1, 2;                                                   -- expect 8 rows
-- select relname, relrowsecurity from pg_class
--  where relnamespace = 'public'::regnamespace and relname in ('hero_slides', 'instagram_reels', 'blog_posts');
--                                                                   -- expect 3 rows, all true
-- select column_name from information_schema.columns
--  where table_schema = 'public' and table_name = 'products' and column_name like 'seo_%';
--                                                                   -- expect seo_description, seo_title

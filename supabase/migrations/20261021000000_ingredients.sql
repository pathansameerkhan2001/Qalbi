-- =============================================================================
-- QALBI Naturals — INGREDIENTS (run after 20261019000000_content_management.sql)
--
-- What it creates
--   • ingredients — the homepage ingredient carousel and the /ingredients page,
--                   managed in /admin/ingredients. Photos live in the existing
--                   qalbi-naturals-media bucket (uploaded through /admin).
--
-- Until an administrator adds an active ingredient, the website keeps showing
-- its built-in confirmed list (src/data/ingredients.ts).
--
-- Security model (same as the earlier migrations)
--   • RLS on. Visitors read only active rows.
--   • Writes only for administrators verified by public.is_admin().
--   • Explicit least-privilege grants; no TRUNCATE; no functions added.
--
-- What it does NOT change
--   • No existing table, row, bucket, storage policy or function.
--   • No sample content is inserted.
--
-- Plain CREATEs: if anything already exists the script stops and rolls back.
-- Run as ONE script in Supabase → SQL Editor.
-- =============================================================================

begin;

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (char_length(slug) <= 60 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 40),
  -- Neutral note about the botanical itself, not a product claim.
  description text not null check (char_length(description) between 1 and 160),
  -- Real photograph (storage object path). Null → the card shows the line icon.
  image_path text check (char_length(image_path) <= 300 and image_path ~ '^[a-z0-9][a-z0-9/_.-]*$' and image_path !~ '\.\.'),
  image_alt text check (char_length(image_alt) <= 200),
  icon text not null default 'leaf' check (icon in ('saffron', 'rose', 'coconut', 'aloe', 'turmeric', 'neem', 'cardamom', 'leaf')),
  -- Product handles whose confirmed formulation names this ingredient ("Found in" links).
  product_handles text[] not null default '{}' check (cardinality(product_handles) <= 20),
  sort_order integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A photograph always has a description for screen readers.
  check (image_path is null or coalesce(char_length(image_alt), 0) > 0)
);
create index ingredients_order_idx on public.ingredients (sort_order, created_at);

create trigger ingredients_touch before update on public.ingredients
  for each row execute function public.touch_updated_at();

alter table public.ingredients enable row level security;

create policy "ingredients: public read active" on public.ingredients
  for select to anon, authenticated using (is_active);
create policy "ingredients: admin write" on public.ingredients
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.ingredients from anon, authenticated;
grant select on public.ingredients to anon, authenticated;
grant insert, update, delete on public.ingredients to authenticated;

commit;

-- ---------------------------------------------------------------------------
-- Read-only verification after commit
-- ---------------------------------------------------------------------------
-- select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'ingredients' order by 1;
--                                                                   -- expect 2 rows
-- select relrowsecurity from pg_class where oid = 'public.ingredients'::regclass;   -- expect true

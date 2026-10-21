-- =============================================================================
-- QALBI Naturals — OPTIONAL: add QALBI's five products as DRAFTS
--
-- Why: the website's preview catalogue (src/data/dev-products.ts) has never
-- been in the database, so /admin/products only lists what was added there by
-- hand. This script copies the confirmed product facts — names, URL handles,
-- label taglines and QALBI's own photographs — into the database so they can be
-- reviewed and completed in /admin/products.
--
-- What it deliberately does NOT do
--   • No prices: every product is inserted at ₹0. The admin form refuses to
--     publish a product until a real price above ₹0 is entered.
--   • No stock: stock is 0 until you enter the real quantity (or clear it if
--     you don't track stock).
--   • Nothing is published: products are drafts and categories are hidden.
--   • Never changes or deletes an existing row: anything whose URL handle
--     already exists (including the 'test' product) is skipped.
--
-- Descriptions are the taglines printed on QALBI's own labels (client photos
-- 19, 20, 23, 24, 30, 40); "For day and night use" reflects the label's sun and
-- moon icons. No ingredient lists or other claims are added.
--
-- Images are website assets (public/assets/products/…, the same 18 photos as
-- the preview galleries), served by the site itself while
-- NEXT_PUBLIC_ASSET_SOURCE=local. They are NOT in the storage bucket yet: run
-- `npm run assets:upload` before ever switching that setting to "supabase".
-- Replace them any time in /admin/products.
--
-- Run as ONE script in Supabase → SQL Editor, after the migrations. Safe to run
-- twice (the second run inserts nothing).
-- =============================================================================

begin;

insert into public.categories (name, slug, sort_order, is_active) values
  ('Serums', 'serums', 1, false),
  ('Face Creams & Moisturisers', 'face-creams-moisturisers', 2, false),
  ('Face Wash & Cleansers', 'face-wash-cleansers', 3, false)
on conflict (slug) do nothing;

with source (slug, name, category_slug, description) as (
  values
    ('multipurpose-booster-serum', 'Multipurpose Booster Serum', 'serums',
     'Brightening | Anti-Aging | Hydrating. For day and night use.'),
    ('radiance-glow-cream', 'Radiance Glow Cream', 'face-creams-moisturisers',
     'Repair | Nourish | Brightens. For youthful, smooth & supple skin. All skin types. For day and night use.'),
    ('facial-cleanser', 'Facial Cleanser', 'face-wash-cleansers',
     'Cleanse | Hydrates | Brightens. All skin types. Net content: 100 g. For day and night use.'),
    ('moisturizer', 'Moisturizer', 'face-creams-moisturisers',
     'Moisturize | Nourish | Glowing. All skin types. Net content: 100 g. For day and night use.'),
    ('anti-aging-cream', 'Anti-Aging Cream', 'face-creams-moisturisers',
     'Plumps | Contour | Restore.')
),
inserted as (
  insert into public.products (category_id, name, slug, description, price, stock_quantity, is_published)
  select c.id, s.name, s.slug, s.description, 0, 0, false
    from source s
    left join public.categories c on c.slug = s.category_slug
  on conflict (slug) do nothing
  returning id, slug
)
insert into public.product_images (product_id, image_url, alt_text, sort_order, is_primary)
select i.id, img.path, img.alt, img.ord - 1, img.ord = 1
  from inserted i
  join (values
    ('multipurpose-booster-serum', 1, 'products/serum-studio.webp', 'QALBI Multipurpose Booster Serum on a wooden pedestal'),
    ('multipurpose-booster-serum', 2, 'products/serum-gold.webp', 'QALBI Multipurpose Booster Serum on a golden backdrop'),
    ('multipurpose-booster-serum', 3, 'products/serum-botanical.webp', 'QALBI Multipurpose Booster Serum with chamomile and lemon'),
    ('multipurpose-booster-serum', 4, 'products/serum-cutout.webp', 'QALBI Multipurpose Booster Serum bottle'),
    ('multipurpose-booster-serum', 5, 'products/multipurpose-booster-serum.webp', 'QALBI Multipurpose Booster Serum on marble'),
    ('radiance-glow-cream', 1, 'products/radiance-studio.webp', 'QALBI Radiance Glow Cream on a stone pedestal over sand'),
    ('radiance-glow-cream', 2, 'products/radiance-garden.webp', 'QALBI Radiance Glow Cream among white blossoms'),
    ('radiance-glow-cream', 3, 'products/radiance-forest.webp', 'QALBI Radiance Glow Cream on a mossy log'),
    ('radiance-glow-cream', 4, 'products/radiance-noir.webp', 'QALBI Radiance Glow Cream bottle'),
    ('facial-cleanser', 1, 'products/cleanser-studio.webp', 'QALBI Facial Cleanser on a stone in soft sunlight'),
    ('facial-cleanser', 2, 'products/cleanser-splash.webp', 'QALBI Facial Cleanser in a water splash'),
    ('facial-cleanser', 3, 'products/cleanser-coconut.webp', 'QALBI Facial Cleanser with fresh coconut'),
    ('facial-cleanser', 4, 'products/cleanser-roses.webp', 'QALBI Facial Cleanser among pink roses'),
    ('facial-cleanser', 5, 'products/facial-cleanser.webp', 'QALBI Facial Cleanser on a sunflower'),
    ('moisturizer', 1, 'products/moisturizer-studio.webp', 'QALBI Moisturizer on a stone pedestal with blossoms'),
    ('moisturizer', 2, 'products/moisturizer-sky.webp', 'QALBI Moisturizer on stones against a pastel sky'),
    ('moisturizer', 3, 'products/moisturizer-noir.webp', 'QALBI Moisturizer on a wooden slice'),
    ('anti-aging-cream', 1, 'products/anti-aging.webp', 'QALBI Anti-Aging cream jar on marble')
  ) as img (slug, ord, path, alt) on img.slug = i.slug;

commit;

-- Read-only check afterwards:
-- select slug, price, stock_quantity, is_published from public.products order by created_at;

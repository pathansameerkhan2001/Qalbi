-- =============================================================================
-- LEGACY — DO NOT RUN AGAINST PRODUCTION.
-- Written for an empty database. The QALBI production project already has its
-- own products/categories/product_images/store_settings tables; this file
-- conflicts with them. Use supabase/production/*.sql instead.
-- =============================================================================

-- =============================================================================
-- QALBI Naturals — starter catalogue
--
-- Loaded automatically by `npx supabase db reset` (local development).
-- For the live project you may run it once in the SQL editor, then manage
-- everything in /admin.
--
-- IMPORTANT: prices below are the PREVIEW prices from the design reference and
-- are NOT confirmed by QALBI. Review every price in /admin/products before launch.
-- Image paths are object paths in the `qalbi-naturals-media` bucket
-- (mirrored in /public/assets; upload with `npm run assets:upload`).
-- =============================================================================

insert into public.categories (handle, title, image_path, sort, show_on_home) values
  ('serums', 'Serums', 'categories/serums-studio.webp', 10, true),
  ('face-creams-moisturisers', 'Face Creams & Moisturisers', 'categories/face-creams-studio.webp', 20, true),
  ('lip-care', 'Lip Care', 'categories/lip-care-roses.webp', 30, true),
  ('face-wash-cleansers', 'Face Wash & Cleansers', 'categories/face-wash-studio.webp', 40, true),
  ('toners-face-mists', 'Toners & Face Mists', null, 50, false),
  ('face-masks-exfoliators', 'Face Masks & Exfoliators', 'categories/face-masks-ubtan.webp', 60, true),
  ('eye-care', 'Eye Care', null, 70, false),
  ('body-care', 'Body Care', null, 80, false),
  ('skincare-combos-kits', 'Skincare Combos & Kits', 'categories/combos-collection.webp', 90, true),
  ('bestsellers', 'The QALBI Favourites', null, 100, false)
on conflict (handle) do nothing;

insert into public.products (handle, title, description, product_type, price, category_handles, ingredients, featured, sort) values
  ('multipurpose-booster-serum', 'Multipurpose Booster Serum', 'Brightening | Anti-Aging | Hydrating. For day and night use.', 'Serums', 897,
   '{serums,bestsellers}', 'Key ingredients highlighted by QALBI: Vitamin C, Peptides, Niacinamide, Hyaluronic Acid.', true, 10),
  ('radiance-glow-cream', 'Radiance Glow Cream', 'Repair | Nourish | Brightens. For youthful, smooth & supple skin. All skin types. For day and night use.', 'Face Creams & Moisturisers', 399,
   '{face-creams-moisturisers,bestsellers}', 'Enriched with Pearls, Saffron and Sandalwood.', true, 20),
  ('facial-cleanser', 'Facial Cleanser', 'Cleanse | Hydrates | Brightens. All skin types. Net content: 100 g. For day and night use.', 'Face Wash & Cleansers', 399,
   '{face-wash-cleansers,bestsellers}', E'On the label: Kashmiri saffron, Nutmeg & Rose water.\nAlso highlighted by QALBI: Coconut oil, Green tea extract, Rose extract, Saffron extract, Extra virgin olive oil.', true, 30),
  ('moisturizer', 'Moisturizer', 'Moisturize | Nourish | Glowing. All skin types. Net content: 100 g. For day and night use.', 'Face Creams & Moisturisers', 699,
   '{face-creams-moisturisers,bestsellers}', 'Marigold and Vetiver.', true, 40),
  ('anti-aging-cream', 'Anti-Aging Cream', 'Plumps | Contour | Restore.', 'Face Creams & Moisturisers', 599,
   '{face-creams-moisturisers,bestsellers}', null, true, 50)
on conflict (handle) do nothing;

insert into public.product_images (product_id, path, alt, sort)
select p.id, v.path, v.alt, v.sort
from (values
  ('multipurpose-booster-serum', 'products/serum-studio.webp', 'QALBI Multipurpose Booster Serum on a wooden pedestal', 0),
  ('multipurpose-booster-serum', 'products/serum-gold.webp', 'QALBI Multipurpose Booster Serum on a golden backdrop', 1),
  ('multipurpose-booster-serum', 'products/serum-botanical.webp', 'QALBI Multipurpose Booster Serum with chamomile and lemon', 2),
  ('multipurpose-booster-serum', 'products/serum-cutout.webp', 'QALBI Multipurpose Booster Serum bottle', 3),
  ('radiance-glow-cream', 'products/radiance-studio.webp', 'QALBI Radiance Glow Cream on a stone pedestal over sand', 0),
  ('radiance-glow-cream', 'products/radiance-garden.webp', 'QALBI Radiance Glow Cream among white blossoms', 1),
  ('radiance-glow-cream', 'products/radiance-forest.webp', 'QALBI Radiance Glow Cream on a mossy log', 2),
  ('radiance-glow-cream', 'products/radiance-noir.webp', 'QALBI Radiance Glow Cream bottle', 3),
  ('facial-cleanser', 'products/cleanser-studio.webp', 'QALBI Facial Cleanser on a stone in soft sunlight', 0),
  ('facial-cleanser', 'products/cleanser-splash.webp', 'QALBI Facial Cleanser in a water splash', 1),
  ('facial-cleanser', 'products/cleanser-coconut.webp', 'QALBI Facial Cleanser with fresh coconut', 2),
  ('facial-cleanser', 'products/cleanser-roses.webp', 'QALBI Facial Cleanser among pink roses', 3),
  ('moisturizer', 'products/moisturizer-studio.webp', 'QALBI Moisturizer on a stone pedestal with blossoms', 0),
  ('moisturizer', 'products/moisturizer-sky.webp', 'QALBI Moisturizer on stones against a pastel sky', 1),
  ('moisturizer', 'products/moisturizer-noir.webp', 'QALBI Moisturizer on a wooden slice', 2),
  ('anti-aging-cream', 'products/anti-aging.webp', 'QALBI Anti-Aging cream jar on marble', 0)
) as v(handle, path, alt, sort)
join public.products p on p.handle = v.handle
where not exists (select 1 from public.product_images x where x.product_id = p.id and x.path = v.path);

insert into public.ingredients (slug, name, description, image_path, product_handles, sort) values
  ('saffron', 'Saffron', 'Prized stigmas of the crocus flower, long used in traditional Indian beauty rituals.', 'ingredients/saffron-bowl.webp', '{radiance-glow-cream,facial-cleanser}', 10),
  ('rose', 'Rose', 'Rose petals and rose water, a timeless favourite in gentle skincare rituals.', 'ingredients/rose-fresh.webp', '{facial-cleanser}', 20),
  ('coconut', 'Coconut', 'Coconut oil, a nourishing staple of traditional Indian self-care.', 'ingredients/coconut.webp', '{facial-cleanser}', 30)
on conflict (slug) do nothing;

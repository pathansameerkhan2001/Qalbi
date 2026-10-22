-- Adds QALBI's approved "Shop by Category" categories that are not in the database yet. ALL HIDDEN.
--
-- Same result as /admin/categories → "Suggested categories" → "Add all … as hidden".
-- Use one or the other; running either twice is harmless.
--
--   • Non-destructive: no UPDATE, no DELETE. Existing categories (including the
--     three from import_qalbi_products_as_drafts.sql) are left exactly as they are.
--   • Idempotent: `on conflict (slug) do nothing`, and a name that already exists
--     under another handle is skipped too.
--   • Every new category is hidden (is_active = false) and has no products, so
--     nothing changes on the website until the owner shows one.
--   • The first three handles already exist (product import), so in the live
--     database this adds the other five. Existing rows are not renamed here — see
--     assign_shop_categories.sql step 2 for the approved spellings.
--   • Image paths are the category photos cropped from QALBI's own product photos
--     (public/assets/categories/shop-*.webp; the qalbi-naturals-media bucket once uploaded).
--
-- Run as ONE script in Supabase → SQL Editor (project pcvzyjhlruricsanzuao),
-- only after the store owner approves. Keep in step with src/data/category-suggestions.ts.

begin;

with proposed (name, slug, description, image_url, n) as (
  values
    ('Face Serums',                'serums',                   'Lightweight face serums for your daily ritual.',            'categories/shop-face-serums.webp',              1),
    ('Face Wash & Cleansers',      'face-wash-cleansers',      'Gentle cleansers for fresh, clean skin.',                   'categories/shop-face-wash-cleansers.webp',      2),
    ('Face Creams & Moisturizers', 'face-creams-moisturisers', 'Creams and moisturizers for day and night.',                'categories/shop-face-creams-moisturizers.webp', 3),
    ('Scrubs & Face Masks',        'scrubs-face-masks',        'Ayurvedic scrubs and masks for your weekly ritual.',        'categories/shop-scrubs-face-masks.webp',        4),
    ('Hair Mask & Shampoo',        'hair-mask-shampoo',        'Herbal hair masks and shampoos for your hair-care ritual.', 'categories/shop-hair-mask-shampoo.webp',        5),
    ('Lip, Eye & Lash Care',       'lip-eye-lash-care',        'Care for lips, eyes and lashes.',                           'categories/shop-lip-eye-lash-care.webp',        6),
    ('Body & Personal Care',       'body-personal-care',       'Handcrafted care for everyday bathing and body rituals.',   'categories/shop-body-personal-care.webp',       7),
    ('Herbal Tea',                 'herbal-tea',               'Herbal infusions from QALBI Naturals.',                     'categories/shop-herbal-tea.webp',               8)
)
insert into public.categories (name, slug, description, image_url, sort_order, is_active)
select p.name, p.slug, p.description, p.image_url,
       coalesce((select max(sort_order) from public.categories), 0) + p.n * 10,
       false
from proposed p
where not exists (select 1 from public.categories c where lower(trim(c.name)) = lower(p.name))
on conflict (slug) do nothing;

-- Expect at least 8 rows; the ones just added show is_active = false.
select name, slug, is_active, sort_order from public.categories order by sort_order, name;

commit;

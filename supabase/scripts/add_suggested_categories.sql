-- Adds the proposed QALBI categories that are not in the database yet. ALL HIDDEN.
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
--   • Image paths are QALBI's own photos in public/assets/categories (and the
--     qalbi-naturals-media bucket once uploaded); null where none exists.
--
-- Run as ONE script in Supabase → SQL Editor (project pcvzyjhlruricsanzuao),
-- only after the store owner approves. Keep in step with src/data/category-suggestions.ts.

begin;

with proposed (name, slug, description, image_url, n) as (
  values
    ('Face Wash & Cleansers',      'face-wash-cleansers',      'Gentle daily cleansers for fresh, clean skin.', 'categories/face-wash-studio.webp',  1),
    ('Serums',                     'serums',                   'Lightweight serums for your daily ritual.',     'categories/serums-studio.webp',     2),
    ('Face Creams & Moisturisers', 'face-creams-moisturisers', 'Creams and moisturisers for day and night.',    'categories/face-creams-studio.webp', 3),
    ('Lip Care',                   'lip-care',                 null,                                            'categories/lip-care-roses.webp',    4),
    ('Face Masks & Treatments',    'face-masks-treatments',    null,                                            'categories/face-masks-ubtan.webp',  5),
    ('Gift Sets & Combos',         'gift-sets-combos',         null,                                            'categories/combos-collection.webp', 6),
    ('Sunscreen',                  'sunscreen',                null,                                            null,                                7),
    ('Body Care',                  'body-care',                null,                                            null,                                8),
    ('Hair Care',                  'hair-care',                null,                                            null,                                9),
    ('New Arrivals',               'new-arrivals',             null,                                            null,                                10)
)
insert into public.categories (name, slug, description, image_url, sort_order, is_active)
select p.name, p.slug, p.description, p.image_url,
       coalesce((select max(sort_order) from public.categories), 0) + p.n * 10,
       false
from proposed p
where not exists (select 1 from public.categories c where lower(trim(c.name)) = lower(p.name))
on conflict (slug) do nothing;

-- Expect 10 rows; the ones just added show is_active = false.
select name, slug, is_active, sort_order from public.categories order by sort_order, name;

commit;

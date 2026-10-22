-- Puts the live catalogue into QALBI's approved "Shop by Category" set.
-- RUN ONLY WITH THE STORE OWNER'S APPROVAL. It changes existing rows (no deletes).
--
-- Run add_suggested_categories.sql first (or "Add all … as hidden" in /admin/categories),
-- then this script as ONE script in Supabase → SQL Editor (project pcvzyjhlruricsanzuao).
-- Everything here can also be done by hand in /admin/categories and /admin/products.
--
--   Step 1  Website order 1–8 (sort_order only).
--   Step 2  Approved names for the two imported categories       (commented out: owner decision)
--   Step 3  Assign published products that have NO category yet  (never moves an assigned product)
--   Step 4  Show the categories that have published products     (commented out: owner decision)

begin;

-- Before: every category and its product counts.
select c.name, c.slug, c.is_active, c.sort_order,
       count(p.id) as products, count(p.id) filter (where p.is_published) as published
from public.categories c left join public.products p on p.category_id = c.id
group by c.id order by c.sort_order, c.name;

-- Step 1 ---------------------------------------------------------------------
update public.categories c set sort_order = o.n * 10
from (values ('serums', 1), ('face-wash-cleansers', 2), ('face-creams-moisturisers', 3), ('scrubs-face-masks', 4),
             ('hair-mask-shampoo', 5), ('lip-eye-lash-care', 6), ('body-personal-care', 7), ('herbal-tea', 8)) as o (slug, n)
where c.slug = o.slug and c.sort_order is distinct from o.n * 10;

-- Step 2 (uncomment once approved) -------------------------------------------
-- update public.categories set name = 'Face Serums'                where slug = 'serums'                   and name = 'Serums';
-- update public.categories set name = 'Face Creams & Moisturizers' where slug = 'face-creams-moisturisers' and name = 'Face Creams & Moisturisers';

-- Step 3 ---------------------------------------------------------------------
-- Product handles as they are in the live catalogue on 2026-10-22.
update public.products p set category_id = c.id
from (values
        ('anti-aging-cream-botox',         'face-creams-moisturisers'),
        ('ayuredic-ubtan-face-body-scrub', 'scrubs-face-masks'),
        ('kesh-rasayan-hair-mask-powder',  'hair-mask-shampoo'),
        ('jatamansi-root-care-shampoo',    'hair-mask-shampoo'),
        ('qalbi-lip-balm',                 'lip-eye-lash-care'),
        ('ayurvedic-ubtan-soap',           'body-personal-care'),
        ('beau-tea',                       'herbal-tea'),
        ('qalbi-sliming-tea',              'herbal-tea')
     ) as a (product_slug, category_slug)
join public.categories c on c.slug = a.category_slug
where p.slug = a.product_slug and p.category_id is null;

-- Step 4 (uncomment once approved) -------------------------------------------
-- update public.categories c set is_active = true
-- where c.slug in ('serums', 'face-wash-cleansers', 'face-creams-moisturisers', 'scrubs-face-masks',
--                  'hair-mask-shampoo', 'lip-eye-lash-care', 'body-personal-care', 'herbal-tea')
--   and exists (select 1 from public.products p where p.category_id = c.id and p.is_published);

-- After.
select c.name, c.slug, c.is_active, c.sort_order,
       count(p.id) as products, count(p.id) filter (where p.is_published) as published
from public.categories c left join public.products p on p.category_id = c.id
group by c.id order by c.sort_order, c.name;

commit;

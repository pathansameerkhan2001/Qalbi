-- =============================================================================
-- QALBI Naturals — READ-ONLY setup check. Safe to run at any time in
-- Supabase → SQL Editor: it only reads the system catalogue and row counts.
--
-- One row per migration: "applied" or "MISSING — run <file>".
-- Run missing migrations in timestamp order, each as one script.
-- =============================================================================

with tables as (
  select c.relname
    from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
),
checks (step, migration, applied) as (
  values
    (1, '20261018000000_initial_schema.sql',
        (select count(*) = 8 from tables where relname in
          ('admin_users', 'categories', 'products', 'product_images', 'store_settings', 'orders', 'order_items', 'enquiries'))),
    (2, '20261019000000_content_management.sql',
        (select count(*) = 3 from tables where relname in ('hero_slides', 'instagram_reels', 'blog_posts'))
        and exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'products' and column_name = 'seo_title')),
    (3, '20261021000000_ingredients.sql',
        (select count(*) = 1 from tables where relname = 'ingredients'))
)
select step, migration,
       case when applied then 'applied' else 'MISSING — run supabase/migrations/' || migration end as status
  from checks
 order by step;

-- Catalogue overview (counts only; nothing is changed).
select
  (select count(*) from public.products)                          as products_total,
  (select count(*) from public.products where is_published)       as products_published,
  (select count(*) from public.products where not is_published)   as products_draft,
  (select count(*) from public.product_images)                    as product_images,
  (select count(*) from public.categories)                        as categories_total,
  (select count(*) from public.categories where is_active)        as categories_active,
  (select count(*) from public.admin_users)                       as administrators;

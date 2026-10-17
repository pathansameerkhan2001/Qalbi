-- =============================================================================
-- 00 — PRE-FLIGHT CHECKS (read-only: SELECT statements only)
-- Run in Supabase → SQL Editor and share the results before 01 is applied.
-- No customer data or setting values are selected.
-- =============================================================================

-- 1. Exact column definitions of the existing tables the plan relies on.
--    Needed to confirm nullability (stock_quantity, is_published, price) and
--    that store_settings.id / updated_at have defaults.
select table_name, ordinal_position, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('products', 'categories', 'product_images', 'store_settings')
order by table_name, ordinal_position;

-- 2. Name collisions with objects that 01 creates (expect: no rows in each).
select n.nspname as schema, p.proname as function, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in ('is_admin', 'touch_updated_at', 'place_order', 'get_order_for_customer', 'record_enquiry', 'release_inventory_on_cancel');

select t.typname
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public' and t.typname in ('order_status', 'payment_method', 'payment_status');

select c.relname, c.relkind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('admin_users', 'orders', 'order_items', 'enquiries', 'order_number_seq');

-- 3. Existing triggers and constraints on the tables that get new policies.
select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('products', 'categories', 'product_images', 'store_settings')
order by 1, 2;

select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.products'::regclass, 'public.categories'::regclass,
                   'public.product_images'::regclass, 'public.store_settings'::regclass)
order by 1, 2;

-- 4. Table privileges currently held by the API roles.
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in ('products', 'categories', 'product_images', 'store_settings')
group by 1, 2
order by 1, 2;

-- 5. Catalogue data shape (counts only).
select count(*)                                                        as products_total,
       count(*) filter (where is_published)                            as published,
       count(*) filter (where stock_quantity is null)                  as stock_untracked,
       count(*) filter (where stock_quantity = 0)                      as stock_zero,
       count(*) filter (where price is null)                           as price_missing,
       count(*) filter (where slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$')      as slug_nonstandard
from public.products;

select count(*) as categories_total, count(*) filter (where is_active) as active
from public.categories;

select count(*)                                              as images_total,
       count(*) filter (where image_url like 'https://%')    as full_https_urls,
       count(*) filter (where image_url not like 'http%')    as relative_paths,
       count(*) filter (where is_primary)                    as primary_images
from public.product_images;

-- 6. Settings KEYS only (values are not selected).
select setting_key, updated_at from public.store_settings order by setting_key;
select setting_key, count(*) from public.store_settings group by 1 having count(*) > 1;

-- 7. Storage bucket configuration and object types already stored.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'qalbi-naturals-media';

select metadata ->> 'mimetype' as mime_type, count(*)
from storage.objects where bucket_id = 'qalbi-naturals-media'
group by 1 order by 2 desc;

-- 8. The administrator account (Supabase Auth). Expect exactly one row, confirmed, not banned.
select id, email, email_confirmed_at is not null as confirmed, last_sign_in_at, banned_until
from auth.users
where id = '59dc53a4-8928-4e95-a183-539bc9f79309';

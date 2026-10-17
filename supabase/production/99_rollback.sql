-- =============================================================================
-- 99 — ROLLBACK OF 01 (and 03)
--
-- Drops everything 01 created and returns the 4 catalogue tables and storage
-- to "RLS on, no policies, no triggers". No existing table, column or row is
-- touched. Refuses to run once any order or enquiry exists — export them first.
-- The 02 settings row is kept (delete it separately if wanted).
-- =============================================================================

begin;

do $$
begin
  if exists (select 1 from public.orders) or exists (select 1 from public.enquiries) then
    raise exception 'Orders or enquiries exist. Export them before rolling back.';
  end if;
end $$;

drop policy "qalbi media: admin insert" on storage.objects;
drop policy "qalbi media: admin update" on storage.objects;
drop policy "qalbi media: admin delete" on storage.objects;
drop policy "qalbi media: admin list" on storage.objects;

drop policy "products: public read published" on public.products;
drop policy "products: admin write" on public.products;
drop policy "categories: public read active" on public.categories;
drop policy "categories: admin write" on public.categories;
drop policy "product_images: public read for published products" on public.product_images;
drop policy "product_images: admin write" on public.product_images;
drop policy "store_settings: public read storefront keys" on public.store_settings;
drop policy "store_settings: admin write" on public.store_settings;

drop trigger products_touch on public.products;
drop trigger categories_touch on public.categories;
drop trigger store_settings_touch on public.store_settings;

drop function public.place_order(jsonb);
drop function public.get_order_for_customer(text, uuid);
drop function public.record_enquiry(text, text, text, text, text, jsonb);

drop table public.order_items;
drop table public.orders;
drop table public.enquiries;
drop function public.release_inventory_on_cancel();
drop function public.touch_updated_at();
drop sequence public.order_number_seq;
drop type public.order_status;
drop type public.payment_method;
drop type public.payment_status;

drop table public.admin_users;
drop function public.is_admin();

-- 01 revoked write privileges from anon on the catalogue tables. Restoring them
-- is NOT needed for the website and is left out on purpose. Only if you must
-- return to the exact previous grants (see pre-flight query 4), run:
-- grant insert, update, delete, truncate on public.products, public.categories, public.product_images, public.store_settings to anon;
-- grant truncate on public.products, public.categories, public.product_images, public.store_settings to authenticated;

commit;

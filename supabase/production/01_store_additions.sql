-- =============================================================================
-- 01 — ADDITIONS FOR ADMIN ACCESS, ORDERS, ENQUIRIES AND CHECKOUT
--
-- For the EXISTING QALBI production project (verified by 00_preflight_readonly.sql):
--   • products / categories / product_images / store_settings exist with their
--     own columns, keys and constraints, are empty, have RLS on, no policies
--     and no triggers.
--   • No objects with the names created below exist.
--   • Bucket qalbi-naturals-media exists (public, 8 MB, several MIME types).
--
-- What it changes
--   • Creates: admin_users, is_admin(), orders, order_items, enquiries, three
--     enums, one sequence, touch_updated_at(), release_inventory_on_cancel(),
--     place_order(), get_order_for_customer(), record_enquiry().
--   • Adds RLS policies + updated_at triggers to the 4 existing catalogue tables
--     and revokes write privileges on them from the anonymous role.
--   • Adds 4 admin-only policies on storage.objects.
--
-- What it does NOT change
--   • No column, key or constraint of an existing table; no existing row.
--   • blogs, coupons, customer_reviews, hero_slides, homepage_sections,
--     instagram_reels (they stay as they are: RLS on, no policies).
--   • The storage bucket row (public flag, 8 MB limit, MIME types).
--   • Nobody becomes an administrator (that is 03).
--
-- Every CREATE is plain (no "if not exists" / "or replace"): if anything
-- unexpectedly exists, the script stops and the transaction rolls back.
-- Run as ONE script in Supabase → SQL Editor. Rollback: 99_rollback.sql.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Administrators — authorised by Supabase Auth user id (auth.uid()), which
--    comes from the verified JWT, never from anything the browser sends.
-- ---------------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create policy "admin_users: read own row" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));
-- No insert/update/delete policies: administrators are granted with SQL only (03).

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Orders, order items, enquiries
-- ---------------------------------------------------------------------------
create type public.order_status as enum ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
create type public.payment_method as enum ('COD', 'PHONE');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');

create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  access_token uuid not null default gen_random_uuid(),
  idempotency_key uuid not null unique,
  status public.order_status not null default 'pending',
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  customer_name text not null,
  phone text not null,
  email text,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  notes text,
  subtotal numeric(10, 2) not null,
  delivery_charge numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  currency text not null default 'INR',
  inventory_released boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);

-- product_handle / title / image_path are snapshots taken when the order is
-- placed (from products.slug, products.name, product_images.image_url).
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_handle text not null,
  title text not null,
  image_path text,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity between 1 and 20),
  line_total numeric(10, 2) not null
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('custom-skincare', 'contact')),
  name text not null,
  email text,
  phone text,
  subject text,
  details jsonb not null default '{}',
  handled boolean not null default false,
  created_at timestamptz not null default now()
);
create index enquiries_created_idx on public.enquiries (created_at desc);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.enquiries enable row level security;

-- Administrators read and update. Nobody inserts or deletes through the API:
-- orders come only from place_order(), enquiries only from record_enquiry().
-- Payment status changes only when an administrator sets it.
create policy "orders: admin read" on public.orders
  for select to authenticated using ((select public.is_admin()));
create policy "orders: admin update" on public.orders
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "order_items: admin read" on public.order_items
  for select to authenticated using ((select public.is_admin()));
create policy "order_items: admin update" on public.order_items
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "enquiries: admin read" on public.enquiries
  for select to authenticated using ((select public.is_admin()));
create policy "enquiries: admin update" on public.enquiries
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.admin_users, public.orders, public.order_items, public.enquiries from anon;
grant select on public.admin_users to authenticated;
grant select, update on public.orders, public.order_items, public.enquiries to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Triggers
-- ---------------------------------------------------------------------------
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
-- The existing tables have an updated_at column and no triggers (pre-flight 3).
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();
create trigger store_settings_touch before update on public.store_settings
  for each row execute function public.touch_updated_at();

-- Return reserved stock when an order is cancelled (exactly once).
create function public.release_inventory_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' and not old.inventory_released then
    update public.products p
       set stock_quantity = p.stock_quantity + i.quantity
      from public.order_items i
     where i.order_id = new.id and i.product_id = p.id and p.stock_quantity is not null;
    new.inventory_released = true;
  end if;
  return new;
end;
$$;
create trigger orders_release_inventory before update of status on public.orders
  for each row execute function public.release_inventory_on_cancel();

-- ---------------------------------------------------------------------------
-- 4. Existing catalogue tables: public read of published/active rows only,
--    writes for administrators only.
-- ---------------------------------------------------------------------------
create policy "products: public read published" on public.products
  for select to anon, authenticated using (is_published);
create policy "products: admin write" on public.products
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "categories: public read active" on public.categories
  for select to anon, authenticated using (is_active);
create policy "categories: admin write" on public.categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "product_images: public read for published products" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_images.product_id and p.is_published));
create policy "product_images: admin write" on public.product_images
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Visitors read only the keys the storefront needs; every other key stays admin-only.
create policy "store_settings: public read storefront keys" on public.store_settings
  for select to anon, authenticated
  using (setting_key = any (array['checkout', 'contact', 'announcements', 'hero', 'instagram_reels', 'trust_badges', 'featured']));
create policy "store_settings: admin write" on public.store_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Defence in depth: the anonymous role never needs to write these tables, and
-- TRUNCATE is not subject to RLS.
revoke insert, update, delete, truncate on public.products, public.categories, public.product_images, public.store_settings from anon;
revoke truncate on public.products, public.categories, public.product_images, public.store_settings from authenticated;

-- ---------------------------------------------------------------------------
-- 5. place_order — the only way to create an order.
--    Prices, availability and stock come from public.products; payment options
--    and delivery from store_settings 'checkout'. Orders are always created with
--    payment_status 'pending'. Pay-by-QR ('PHONE') is accepted only when it is
--    enabled AND a QR image is configured.
-- ---------------------------------------------------------------------------
create function public.place_order(payload jsonb)
returns table (order_number text, access_token uuid, total numeric, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_key uuid;
  v_method public.payment_method;
  v_customer jsonb := payload -> 'customer';
  v_settings jsonb;
  v_existing public.orders;
  v_order_id uuid;
  v_number text;
  v_token uuid;
  v_subtotal numeric(10, 2) := 0;
  v_delivery numeric(10, 2) := 0;
  v_free_over numeric;
  v_item record;
  v_count integer := 0;
begin
  begin
    v_key := (payload ->> 'idempotencyKey')::uuid;
  exception when others then
    raise exception 'invalid_request: idempotency key' using errcode = '22023';
  end;
  if v_key is null then
    raise exception 'invalid_request: idempotency key' using errcode = '22023';
  end if;

  -- Idempotency: same key → same order.
  select * into v_existing from public.orders o where o.idempotency_key = v_key;
  if found then
    return query select v_existing.order_number, v_existing.access_token, v_existing.total, false;
    return;
  end if;

  if (payload ->> 'paymentMethod') not in ('COD', 'PHONE') then
    raise exception 'invalid_request: payment method' using errcode = '22023';
  end if;
  v_method := (payload ->> 'paymentMethod')::public.payment_method;

  select s.setting_value::jsonb into v_settings
    from public.store_settings s
   where s.setting_key = 'checkout'
   order by s.updated_at desc nulls last
   limit 1;
  v_settings := coalesce(v_settings, '{}'::jsonb);
  if v_method = 'COD' and coalesce((v_settings ->> 'codEnabled')::boolean, false) is not true then
    raise exception 'payment_method_disabled' using errcode = 'P0001';
  end if;
  if v_method = 'PHONE' and (coalesce((v_settings ->> 'phoneEnabled')::boolean, false) is not true
                             or nullif(trim(coalesce(v_settings ->> 'qrImagePath', '')), '') is null) then
    raise exception 'payment_method_disabled' using errcode = 'P0001';
  end if;

  -- Customer details (the website validates these too; this is the backstop).
  if char_length(trim(coalesce(v_customer ->> 'name', ''))) not between 2 and 80
     or coalesce(v_customer ->> 'phone', '') !~ '^\+?[0-9 -]{7,20}$'
     or char_length(trim(coalesce(v_customer ->> 'addressLine1', ''))) not between 5 and 200
     or char_length(trim(coalesce(v_customer ->> 'city', ''))) not between 2 and 80
     or char_length(trim(coalesce(v_customer ->> 'state', ''))) not between 2 and 80
     or coalesce(v_customer ->> 'postalCode', '') !~ '^[1-9][0-9]{5}$'
     or (nullif(v_customer ->> 'email', '') is not null and (v_customer ->> 'email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
     or char_length(coalesce(v_customer ->> 'notes', '')) > 500
     or char_length(coalesce(v_customer ->> 'addressLine2', '')) > 200 then
    raise exception 'invalid_request: customer details' using errcode = '22023';
  end if;

  if jsonb_typeof(payload -> 'items') <> 'array' or jsonb_array_length(payload -> 'items') not between 1 and 30 then
    raise exception 'invalid_request: items' using errcode = '22023';
  end if;

  v_number := 'QN-' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD') || '-' || nextval('public.order_number_seq');

  insert into public.orders (
    order_number, idempotency_key, payment_method, payment_status, status,
    customer_name, phone, email, address_line1, address_line2, city, state, postal_code, notes,
    subtotal, delivery_charge, total
  ) values (
    v_number, v_key, v_method, 'pending', 'pending',
    trim(v_customer ->> 'name'), trim(v_customer ->> 'phone'), nullif(trim(coalesce(v_customer ->> 'email', '')), ''),
    trim(v_customer ->> 'addressLine1'), nullif(trim(coalesce(v_customer ->> 'addressLine2', '')), ''),
    trim(v_customer ->> 'city'), trim(v_customer ->> 'state'), v_customer ->> 'postalCode',
    nullif(trim(coalesce(v_customer ->> 'notes', '')), ''),
    0, 0, 0
  ) returning id, orders.access_token into v_order_id, v_token;

  -- Merge duplicate product lines, then lock and price each product.
  for v_item in
    select (i ->> 'productId')::uuid as product_id, sum((i ->> 'quantity')::integer) as quantity
      from jsonb_array_elements(payload -> 'items') as i
     group by 1
  loop
    declare
      v_product public.products;
      v_image text;
    begin
      if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 20 then
        raise exception 'invalid_request: quantity' using errcode = '22023';
      end if;
      select * into v_product from public.products p where p.id = v_item.product_id for update;
      if not found or v_product.is_published is not true or v_product.price is null then
        raise exception 'product_unavailable: %', coalesce(v_product.name, 'unknown product') using errcode = 'P0001';
      end if;
      -- stock_quantity null = not tracked; otherwise reserve the units now.
      if v_product.stock_quantity is not null then
        if v_product.stock_quantity < v_item.quantity then
          raise exception 'insufficient_stock: %', v_product.name using errcode = 'P0001';
        end if;
        update public.products set stock_quantity = stock_quantity - v_item.quantity where id = v_product.id;
      end if;
      select pi.image_url into v_image
        from public.product_images pi
       where pi.product_id = v_product.id
       order by pi.is_primary desc nulls last, pi.sort_order nulls last, pi.id
       limit 1;

      insert into public.order_items (order_id, product_id, product_handle, title, image_path, unit_price, quantity, line_total)
      values (v_order_id, v_product.id, v_product.slug, v_product.name, v_image, v_product.price, v_item.quantity, v_product.price * v_item.quantity);
      v_subtotal := v_subtotal + v_product.price * v_item.quantity;
      v_count := v_count + 1;
    end;
  end loop;

  if v_count = 0 then
    raise exception 'invalid_request: items' using errcode = '22023';
  end if;

  v_delivery := coalesce((v_settings ->> 'deliveryCharge')::numeric, 0);
  v_free_over := nullif(v_settings ->> 'freeDeliveryOver', '')::numeric;
  if v_free_over is not null and v_subtotal >= v_free_over then
    v_delivery := 0;
  end if;

  update public.orders
     set subtotal = v_subtotal, delivery_charge = v_delivery, total = v_subtotal + v_delivery
   where id = v_order_id;

  return query select v_number, v_token, v_subtotal + v_delivery, true;
end;
$$;
revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. get_order_for_customer — confirmation page lookup (order number + secret token).
-- ---------------------------------------------------------------------------
create function public.get_order_for_customer(p_order_number text, p_access_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'orderNumber', o.order_number,
    'createdAt', o.created_at,
    'status', o.status,
    'paymentMethod', o.payment_method,
    'paymentStatus', o.payment_status,
    'customerName', o.customer_name,
    'phone', o.phone,
    'email', o.email,
    'addressLine1', o.address_line1,
    'addressLine2', o.address_line2,
    'city', o.city,
    'state', o.state,
    'postalCode', o.postal_code,
    'subtotal', o.subtotal,
    'deliveryCharge', o.delivery_charge,
    'total', o.total,
    'currency', o.currency,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', i.title, 'handle', i.product_handle, 'imagePath', i.image_path,
        'unitPrice', i.unit_price, 'quantity', i.quantity, 'lineTotal', i.line_total
      ) order by i.title)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.order_number = p_order_number and o.access_token = p_access_token;
$$;
revoke all on function public.get_order_for_customer(text, uuid) from public;
grant execute on function public.get_order_for_customer(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. record_enquiry — stores form submissions without giving visitors read access.
-- ---------------------------------------------------------------------------
create function public.record_enquiry(p_kind text, p_name text, p_email text, p_phone text, p_subject text, p_details jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind not in ('custom-skincare', 'contact') or char_length(coalesce(p_name, '')) not between 2 and 80
     or char_length(coalesce(p_details::text, '')) > 6000 then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  insert into public.enquiries (kind, name, email, phone, subject, details)
  values (p_kind, p_name, nullif(p_email, ''), nullif(p_phone, ''), nullif(p_subject, ''), coalesce(p_details, '{}'::jsonb));
end;
$$;
revoke all on function public.record_enquiry(text, text, text, text, text, jsonb) from public;
grant execute on function public.record_enquiry(text, text, text, text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Storage: administrators manage objects in the existing public bucket.
--    The bucket row is NOT modified. Public file URLs work without a select
--    policy because the bucket is public.
-- ---------------------------------------------------------------------------
create policy "qalbi media: admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'qalbi-naturals-media' and (select public.is_admin()));
create policy "qalbi media: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'qalbi-naturals-media' and (select public.is_admin()))
  with check (bucket_id = 'qalbi-naturals-media' and (select public.is_admin()));
create policy "qalbi media: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'qalbi-naturals-media' and (select public.is_admin()));
create policy "qalbi media: admin list" on storage.objects
  for select to authenticated using (bucket_id = 'qalbi-naturals-media' and (select public.is_admin()));

commit;

-- ---------------------------------------------------------------------------
-- Read-only verification after commit
-- ---------------------------------------------------------------------------
-- select schemaname, tablename, policyname, cmd from pg_policies
--  where schemaname in ('public', 'storage') order by 1, 2, 3;          -- expect 19 rows
-- select proname from pg_proc where pronamespace = 'public'::regnamespace
--  and proname in ('is_admin','place_order','get_order_for_customer','record_enquiry',
--                  'touch_updated_at','release_inventory_on_cancel');    -- expect 6 rows
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets
--  where id = 'qalbi-naturals-media';                                    -- unchanged

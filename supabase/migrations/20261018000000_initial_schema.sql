-- =============================================================================
-- QALBI Naturals — INITIAL SCHEMA FOR AN EMPTY SUPABASE PROJECT
--
-- Target: project pcvzyjhlruricsanzuao, verified on 2026-10-18 to have
--   • no tables in the public schema (no admin_users),
--   • no policies on storage.objects,
--   • bucket qalbi-naturals-media already created (public; JPEG/PNG/WebP/AVIF).
--
-- Do NOT run supabase/legacy/* (different schema) or supabase/production/*
-- (written for an older project that already had catalogue tables) here.
--
-- Every table and column below is one the website reads or writes:
--   src/lib/store/catalog.ts, src/lib/store/settings.ts, src/lib/admin/*.ts,
--   src/app/(site)/checkout/*, src/lib/server/record-enquiry.ts.
--
-- What it creates
--   • admin_users + is_admin()          — admin = row keyed by auth.users id
--   • categories, products, product_images, store_settings (catalogue/settings)
--   • orders, order_items, enquiries    — written only by functions below
--   • request_throttle + throttle_hit() — database rate limits
--   • place_order / place_order_checked, record_enquiry / record_enquiry_checked,
--     get_order_for_customer
--   • RLS policies and explicit privileges for anon / authenticated
--   • 4 admin-only policies on storage.objects for bucket qalbi-naturals-media
--   • one store_settings row: checkout with COD and QR payment both OFF
--
-- What it does NOT do
--   • Modify or recreate the storage bucket (storage.buckets is not touched).
--   • Add products, categories, prices, customers or orders.
--   • Make anyone an administrator (see supabase/scripts/grant_admin.sql).
--
-- All CREATEs are plain (no "if not exists" / "or replace"): if anything
-- already exists, the script stops and the whole transaction rolls back.
-- Run as ONE script in Supabase → SQL Editor.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Administrators
--    Authorised by Supabase Auth user id (auth.uid() comes from the verified
--    JWT, never from anything the browser sends). No API role can insert,
--    update or delete rows here — administrators are granted with SQL only.
-- ---------------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create policy "admin_users: read own row" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

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

-- ---------------------------------------------------------------------------
-- 2. Catalogue and settings (columns as queried in src/lib/store/catalog.ts)
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (char_length(description) <= 400),
  image_url text check (char_length(image_url) between 1 and 300),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  -- Deleting a category that still has products is refused (the admin is told to move them first).
  category_id uuid references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 4000),
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price is null or compare_at_price > price),
  -- null = stock not tracked; otherwise units on hand (reserved when an order is placed).
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  sku text unique check (char_length(sku) between 1 and 64),
  is_featured boolean not null default false,
  is_best_seller boolean not null default false,
  -- New products stay hidden from the storefront until explicitly published.
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  image_url text not null check (char_length(image_url) between 1 and 300),
  alt_text text check (char_length(alt_text) <= 200),
  sort_order integer not null default 0,
  is_primary boolean not null default false
);
create index product_images_product_idx on public.product_images (product_id, sort_order);
create unique index product_images_one_primary on public.product_images (product_id) where is_primary;

create table public.store_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique check (setting_key ~ '^[a-z_]{1,40}$'),
  setting_value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger store_settings_touch before update on public.store_settings
  for each row execute function public.touch_updated_at();

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.store_settings enable row level security;

-- Visitors read published products, active categories and the images of
-- published products. Administrators read and write everything.
create policy "categories: public read active" on public.categories
  for select to anon, authenticated using (is_active);
create policy "categories: admin write" on public.categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "products: public read published" on public.products
  for select to anon, authenticated using (is_published);
create policy "products: admin write" on public.products
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "product_images: public read for published products" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_images.product_id and p.is_published));
create policy "product_images: admin write" on public.product_images
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Visitors read only the keys the storefront needs; brand_claims and any other key stay admin-only.
create policy "store_settings: public read storefront keys" on public.store_settings
  for select to anon, authenticated
  using (setting_key = any (array['checkout', 'contact', 'announcements', 'hero', 'instagram_reels', 'trust_badges', 'featured']));
create policy "store_settings: admin write" on public.store_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Checkout starts CLOSED: no Cash on Delivery, no QR payment. place_order()
-- refuses every order until an administrator turns a method on in /admin/settings
-- (QR additionally needs the real QR image path).
insert into public.store_settings (setting_key, setting_value) values
  ('checkout', '{"codEnabled": false, "phoneEnabled": false, "deliveryCharge": 0, "freeDeliveryOver": null, "qrImagePath": null}');

-- ---------------------------------------------------------------------------
-- 3. Orders, order items, enquiries
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
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_charge numeric(10, 2) not null default 0 check (delivery_charge >= 0),
  total numeric(10, 2) not null check (total >= 0),
  currency text not null default 'INR',
  inventory_released boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_created_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);

-- product_handle / title / image_path / unit_price are snapshots taken when the
-- order is placed, so deleting or editing a product never changes order history.
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_handle text not null,
  title text not null,
  image_path text,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total numeric(10, 2) not null check (line_total >= 0)
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

create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Return reserved stock when an order is cancelled (exactly once). A cancelled
-- order can never be reopened: its stock has already been returned.
create function public.release_inventory_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'order_cancelled: a cancelled order cannot be reopened' using errcode = 'P0001';
  end if;
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

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.enquiries enable row level security;

-- Administrators read; they may change only an order's status / payment status
-- (column grants below) and an enquiry's handled flag. Nobody inserts or deletes
-- through the API: orders come only from place_order(), enquiries only from
-- record_enquiry(), both reachable only through the server-key wrappers.
create policy "orders: admin read" on public.orders
  for select to authenticated using ((select public.is_admin()));
create policy "orders: admin update" on public.orders
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "order_items: admin read" on public.order_items
  for select to authenticated using ((select public.is_admin()));
create policy "enquiries: admin read" on public.enquiries
  for select to authenticated using ((select public.is_admin()));
create policy "enquiries: admin update" on public.enquiries
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- 4. place_order — creates an order. Not callable through the public API;
--    only place_order_checked() (server key + rate limits) calls it.
--    Prices, availability and stock come from public.products; payment options
--    and delivery from store_settings 'checkout'.
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

  if coalesce(payload ->> 'paymentMethod', '') not in ('COD', 'PHONE') then
    raise exception 'invalid_request: payment method' using errcode = '22023';
  end if;
  v_method := (payload ->> 'paymentMethod')::public.payment_method;

  select s.setting_value into v_settings from public.store_settings s where s.setting_key = 'checkout';
  v_settings := coalesce(v_settings, '{}'::jsonb);
  -- A method is on only when its flag is exactly JSON true (missing or malformed = off).
  if v_method = 'COD' and (v_settings -> 'codEnabled') is distinct from 'true'::jsonb then
    raise exception 'payment_method_disabled' using errcode = 'P0001';
  end if;
  if v_method = 'PHONE' and ((v_settings -> 'phoneEnabled') is distinct from 'true'::jsonb
                             or nullif(trim(coalesce(v_settings ->> 'qrImagePath', '')), '') is null) then
    raise exception 'payment_method_disabled' using errcode = 'P0001';
  end if;

  -- Customer details (the website validates these too; this is the backstop).
  if jsonb_typeof(v_customer) is distinct from 'object'
     or char_length(trim(coalesce(v_customer ->> 'name', ''))) not between 2 and 80
     or coalesce(v_customer ->> 'phone', '') !~ '^\+?[0-9 -]{7,20}$'
     or char_length(trim(coalesce(v_customer ->> 'addressLine1', ''))) not between 5 and 200
     or char_length(trim(coalesce(v_customer ->> 'city', ''))) not between 2 and 80
     or char_length(trim(coalesce(v_customer ->> 'state', ''))) not between 2 and 80
     or coalesce(v_customer ->> 'postalCode', '') !~ '^[1-9][0-9]{5}$'
     or (nullif(v_customer ->> 'email', '') is not null and ((v_customer ->> 'email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                                                            or char_length(v_customer ->> 'email') > 254))
     or char_length(coalesce(v_customer ->> 'notes', '')) > 500
     or char_length(coalesce(v_customer ->> 'addressLine2', '')) > 200 then
    raise exception 'invalid_request: customer details' using errcode = '22023';
  end if;

  if jsonb_typeof(payload -> 'items') is distinct from 'array' or jsonb_array_length(payload -> 'items') not between 1 and 30 then
    raise exception 'invalid_request: items' using errcode = '22023';
  end if;
  -- Every item must be {productId: uuid, quantity: integer}; reject anything else
  -- with a clear error instead of a cast failure.
  if exists (
    select 1 from jsonb_array_elements(payload -> 'items') as i
     where jsonb_typeof(i) is distinct from 'object'
        or coalesce(i ->> 'productId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or jsonb_typeof(i -> 'quantity') is distinct from 'number'
        or (i ->> 'quantity') !~ '^[0-9]{1,2}$'
  ) then
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

  -- Merge duplicate product lines, then lock and price each product. Products
  -- are locked in id order so concurrent orders cannot deadlock.
  for v_item in
    select (i ->> 'productId')::uuid as product_id, sum((i ->> 'quantity')::integer) as quantity
      from jsonb_array_elements(payload -> 'items') as i
     group by 1
     order by 1
  loop
    declare
      v_product public.products;
      v_image text;
    begin
      if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 20 then
        raise exception 'invalid_request: quantity' using errcode = '22023';
      end if;
      select * into v_product from public.products p where p.id = v_item.product_id for update;
      if not found or v_product.is_published is not true then
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
       order by pi.is_primary desc, pi.sort_order, pi.id
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

  -- Settings are validated by the admin form; clamp anyway so a bad value can never produce a negative charge.
  v_delivery := greatest(coalesce(nullif(v_settings ->> 'deliveryCharge', '')::numeric, 0), 0);
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

-- ---------------------------------------------------------------------------
-- 5. get_order_for_customer — confirmation page lookup. Needs the order number
--    AND the secret access token (random UUID returned only to the buyer).
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

-- ---------------------------------------------------------------------------
-- 6. record_enquiry — stores a form submission. Not callable through the public
--    API; only record_enquiry_checked() (server key + rate limits) calls it.
-- ---------------------------------------------------------------------------
create function public.record_enquiry(p_kind text, p_name text, p_email text, p_phone text, p_subject text, p_details jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind is null or p_kind not in ('custom-skincare', 'contact')
     or char_length(coalesce(p_name, '')) not between 2 and 80
     or char_length(coalesce(p_email, '')) > 254
     or char_length(coalesce(p_phone, '')) > 30
     or char_length(coalesce(p_subject, '')) > 200
     or (p_details is not null and jsonb_typeof(p_details) <> 'object')
     or char_length(coalesce(p_details::text, '')) > 6000 then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  insert into public.enquiries (kind, name, email, phone, subject, details)
  values (p_kind, p_name, nullif(p_email, ''), nullif(p_phone, ''), nullif(p_subject, ''), coalesce(p_details, '{}'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Rate limits and the only public entry points for orders / enquiries.
--    The *_checked wrappers are executable ONLY by service_role, i.e. by the
--    website's server code holding the server-only secret key.
--      orders:    5 per client per hour · 3 pending orders per phone number per
--                 24 hours · 60 per hour in total (circuit breaker)
--      enquiries: 10 per client per hour · 200 per hour in total
--    "client" is an HMAC of the visitor's IP computed by the website server.
-- ---------------------------------------------------------------------------
create table public.request_throttle (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);
alter table public.request_throttle enable row level security;
-- No policies: no API role can read or write the counters.

-- Counts one hit in the current fixed window; true while within the limit.
-- Runs inside the caller's transaction, so a request that fails later is not counted.
create function public.throttle_hit(p_bucket text, p_limit integer, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seconds double precision := extract(epoch from p_window);
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / v_seconds) * v_seconds);
  v_hits integer;
begin
  insert into public.request_throttle as t (bucket, window_start, hits)
  values (p_bucket, v_start, 1)
  on conflict (bucket, window_start) do update set hits = t.hits + 1
  returning t.hits into v_hits;
  delete from public.request_throttle where window_start < now() - interval '2 days';
  return v_hits <= p_limit;
end;
$$;

create function public.place_order_checked(payload jsonb, p_client text)
returns table (order_number text, access_token uuid, total numeric, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key uuid;
  v_phone text;
begin
  if p_client is null or p_client !~ '^[a-f0-9]{32,64}$' then
    raise exception 'invalid_request: client' using errcode = '22023';
  end if;
  begin
    v_key := (payload ->> 'idempotencyKey')::uuid;
  exception when others then
    v_key := null;
  end;

  -- A retry of an order that already exists returns it without counting.
  if v_key is null or not exists (select 1 from public.orders o where o.idempotency_key = v_key) then
    if not public.throttle_hit('order:client:' || p_client, 5, interval '1 hour')
       or not public.throttle_hit('order:all', 60, interval '1 hour') then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
    v_phone := right(regexp_replace(coalesce(payload -> 'customer' ->> 'phone', ''), '[^0-9]', '', 'g'), 10);
    if v_phone <> '' and (
      select count(*) from public.orders o
       where o.status = 'pending' and o.created_at > now() - interval '24 hours'
         and right(regexp_replace(o.phone, '[^0-9]', '', 'g'), 10) = v_phone
    ) >= 3 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;

  return query select * from public.place_order(payload);
end;
$$;

create function public.record_enquiry_checked(p_client text, p_kind text, p_name text, p_email text, p_phone text, p_subject text, p_details jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_client is null or p_client !~ '^[a-f0-9]{32,64}$' then
    raise exception 'invalid_request: client' using errcode = '22023';
  end if;
  if not public.throttle_hit('enquiry:client:' || p_client, 10, interval '1 hour')
     or not public.throttle_hit('enquiry:all', 200, interval '1 hour') then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  perform public.record_enquiry(p_kind, p_name, p_email, p_phone, p_subject, p_details);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Privileges (least privilege)
--    Supabase may give the API roles every right on new tables, sequences and
--    functions by default (and PUBLIC can execute new functions). Remove all of
--    it, then grant back exactly what the website uses. RLS still applies on
--    top of every table grant. TRUNCATE is never granted (RLS does not cover it).
-- ---------------------------------------------------------------------------
revoke all on public.admin_users, public.categories, public.products, public.product_images, public.store_settings,
              public.orders, public.order_items, public.enquiries, public.request_throttle
  from anon, authenticated;
revoke all on sequence public.order_number_seq from anon, authenticated;

-- Storefront reads (RLS: published / active / storefront keys only).
grant select on public.categories, public.products, public.product_images, public.store_settings to anon, authenticated;
-- Admin panel writes (RLS: is_admin() only).
grant insert, update, delete on public.categories, public.products, public.product_images, public.store_settings to authenticated;
-- Admin panel reads and the few fields an administrator may change.
grant select on public.admin_users, public.orders, public.order_items, public.enquiries to authenticated;
grant update (status, payment_status) on public.orders to authenticated;
grant update (handled) on public.enquiries to authenticated;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.release_inventory_on_cancel() from public, anon, authenticated;
revoke all on function public.throttle_hit(text, integer, interval) from public, anon, authenticated;
revoke all on function public.place_order(jsonb) from public, anon, authenticated;
revoke all on function public.record_enquiry(text, text, text, text, text, jsonb) from public, anon, authenticated;

revoke all on function public.place_order_checked(jsonb, text) from public, anon, authenticated;
revoke all on function public.record_enquiry_checked(text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.place_order_checked(jsonb, text) to service_role;
grant execute on function public.record_enquiry_checked(text, text, text, text, text, text, jsonb) to service_role;

-- Confirmation page: callable with the publishable key, useless without the secret token.
revoke all on function public.get_order_for_customer(text, uuid) from public, anon, authenticated;
grant execute on function public.get_order_for_customer(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Storage: administrators manage objects in the EXISTING public bucket.
--    storage.buckets is not modified. Public file URLs work without a select
--    policy because the bucket is public; the select policy below only lets
--    administrators LIST the bucket (media library) and is required, together
--    with insert and update, for "replace" uploads (upsert).
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
-- select tablename, policyname, cmd from pg_policies
--  where schemaname in ('public', 'storage') order by 1, 2;       -- expect 18 rows (14 public, 4 storage)
-- select relname, relrowsecurity from pg_class
--  where relnamespace = 'public'::regnamespace and relkind = 'r'; -- every row: true
-- select p.proname,
--        has_function_privilege('anon', p.oid, 'EXECUTE')          as anon,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
--        has_function_privilege('service_role', p.oid, 'EXECUTE')  as service_role
--   from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1;
--   expect (anon / authenticated):
--           is_admin, get_order_for_customer → t / t
--           every other function             → f / f
--   expect (service_role):
--           place_order_checked, record_enquiry_checked → t (granted above)
--           every other function → t or f, depending on Supabase's built-in
--           default privileges for this project; either result is acceptable.
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets
--  where id = 'qalbi-naturals-media';                              -- unchanged

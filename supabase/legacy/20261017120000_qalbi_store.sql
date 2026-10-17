-- =============================================================================
-- LEGACY — DO NOT RUN AGAINST PRODUCTION.
-- Written for an empty database. The QALBI production project already has its
-- own products/categories/product_images/store_settings tables; this file
-- conflicts with them. Use supabase/production/*.sql instead.
-- =============================================================================

-- =============================================================================
-- QALBI Naturals — store, admin and checkout schema
--
-- Run once per Supabase project:
--   • Supabase Dashboard → SQL Editor → paste this file → Run, or
--   • `npx supabase db push` with the CLI linked to the project.
--
-- Security model
--   • Public (anon) can read the catalogue, categories, ingredients and
--     public site settings. Nothing else.
--   • Orders are created only through public.place_order(), which prices
--     every line from the products table (never from the browser) and
--     applies the checkout settings. Customers read their own order only
--     through public.get_order_for_customer() with the secret access token
--     issued at checkout.
--   • Administrators are rows in public.admin_users. Every write policy
--     checks public.is_admin(); the website also checks it on the server.
--   • Storage bucket `qalbi-naturals-media` is publicly readable; only
--     administrators can upload, replace or delete objects.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Administrators
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

-- A signed-in user may only see their own admin row (used for the server-side check).
drop policy if exists "admin_users: read own row" on public.admin_users;
create policy "admin_users: read own row" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));
-- No insert/update/delete policies: administrators are granted with SQL only (see README).

create or replace function public.is_admin()
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

create or replace function public.touch_updated_at()
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
-- Catalogue
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  handle text primary key check (handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 80),
  image_path text,
  sort integer not null default 0,
  visible boolean not null default true,
  show_on_home boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique check (handle ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  product_type text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price is null or compare_at_price >= 0),
  currency text not null default 'INR' check (currency = 'INR'),
  available boolean not null default true,
  -- null = stock is not tracked; otherwise units on hand (reserved when an order is placed).
  inventory integer check (inventory is null or inventory >= 0),
  category_handles text[] not null default '{}',
  ingredients text,
  directions text,
  warnings text,
  featured boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  path text not null check (char_length(path) between 1 and 300),
  alt text not null default '',
  sort integer not null default 0
);
create index if not exists product_images_product_idx on public.product_images (product_id, sort);

create table if not exists public.ingredients (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  image_path text,
  product_handles text[] not null default '{}',
  sort integer not null default 0,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Site settings (key → JSON). `is_public` rows are readable by visitors.
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.site_settings (key, value) values
  ('checkout', '{"codEnabled": true, "phoneEnabled": true, "deliveryCharge": 0, "freeDeliveryOver": null}'),
  ('contact', '{"whatsappDigits": "919032543737", "whatsappDisplay": "+91 90325 43737", "email": "qalbinaturals@gmail.com"}'),
  ('brand_claims', '{"verified": false, "note": "Vegan, halal, cruelty-free and ingredient-exclusion claims on the About page need supporting documentation."}')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.order_status as enum ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_method as enum ('COD', 'PHONE');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
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
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

create table if not exists public.order_items (
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
create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- Enquiries (copies of contact / customised-skincare form submissions)
-- ---------------------------------------------------------------------------
create table if not exists public.enquiries (
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
create index if not exists enquiries_created_idx on public.enquiries (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories for each row execute function public.touch_updated_at();
drop trigger if exists ingredients_touch on public.ingredients;
create trigger ingredients_touch before update on public.ingredients for each row execute function public.touch_updated_at();
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.site_settings;
create trigger settings_touch before update on public.site_settings for each row execute function public.touch_updated_at();

-- Return reserved stock when an order is cancelled (once).
create or replace function public.release_inventory_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' and not old.inventory_released then
    update public.products p
       set inventory = p.inventory + i.quantity
      from public.order_items i
     where i.order_id = new.id and i.product_id = p.id and p.inventory is not null;
    new.inventory_released = true;
  end if;
  return new;
end;
$$;
drop trigger if exists orders_release_inventory on public.orders;
create trigger orders_release_inventory before update of status on public.orders
  for each row execute function public.release_inventory_on_cancel();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.ingredients enable row level security;
alter table public.site_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.enquiries enable row level security;

-- Catalogue: public read, admin write.
do $$
declare t text;
begin
  foreach t in array array['categories', 'products', 'product_images', 'ingredients'] loop
    execute format('drop policy if exists "%1$s: public read" on public.%1$I', t);
    execute format('create policy "%1$s: public read" on public.%1$I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "%1$s: admin write" on public.%1$I', t);
    execute format('create policy "%1$s: admin write" on public.%1$I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- Settings: visitors read public rows; admins read and write everything.
drop policy if exists "site_settings: public read" on public.site_settings;
create policy "site_settings: public read" on public.site_settings
  for select to anon, authenticated using (is_public or (select public.is_admin()));
drop policy if exists "site_settings: admin write" on public.site_settings;
create policy "site_settings: admin write" on public.site_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Orders, items and enquiries: administrators only (customers use the functions below).
do $$
declare t text;
begin
  foreach t in array array['orders', 'order_items', 'enquiries'] loop
    execute format('drop policy if exists "%1$s: admin read" on public.%1$I', t);
    execute format('create policy "%1$s: admin read" on public.%1$I for select to authenticated using ((select public.is_admin()))', t);
    execute format('drop policy if exists "%1$s: admin update" on public.%1$I', t);
    execute format('create policy "%1$s: admin update" on public.%1$I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- place_order — the only way to create an order.
--
-- payload: {
--   "idempotencyKey": uuid,
--   "paymentMethod": "COD" | "PHONE",
--   "customer": { name, phone, email?, addressLine1, addressLine2?, city, state, postalCode, notes? },
--   "items": [ { "productId": uuid, "quantity": 1..20 }, ... ]
-- }
-- Prices, availability, delivery charge and enabled payment methods are all
-- read from the database. Re-submitting the same idempotencyKey returns the
-- original order instead of creating a duplicate.
-- ---------------------------------------------------------------------------
create or replace function public.place_order(payload jsonb)
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

  select s.value into v_settings from public.site_settings s where s.key = 'checkout';
  v_settings := coalesce(v_settings, '{}'::jsonb);
  if v_method = 'COD' and coalesce((v_settings ->> 'codEnabled')::boolean, false) is not true then
    raise exception 'payment_method_disabled' using errcode = 'P0001';
  end if;
  if v_method = 'PHONE' and coalesce((v_settings ->> 'phoneEnabled')::boolean, false) is not true then
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
      if not found or not v_product.available then
        raise exception 'product_unavailable: %', coalesce(v_product.title, 'unknown product') using errcode = 'P0001';
      end if;
      if v_product.inventory is not null then
        if v_product.inventory < v_item.quantity then
          raise exception 'insufficient_stock: %', v_product.title using errcode = 'P0001';
        end if;
        update public.products set inventory = inventory - v_item.quantity where id = v_product.id;
      end if;
      select pi.path into v_image from public.product_images pi where pi.product_id = v_product.id order by pi.sort, pi.id limit 1;

      insert into public.order_items (order_id, product_id, product_handle, title, image_path, unit_price, quantity, line_total)
      values (v_order_id, v_product.id, v_product.handle, v_product.title, v_image, v_product.price, v_item.quantity, v_product.price * v_item.quantity);
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
-- get_order_for_customer — confirmation page lookup (order number + secret token).
-- ---------------------------------------------------------------------------
create or replace function public.get_order_for_customer(p_order_number text, p_access_token uuid)
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
-- record_enquiry — lets the website store a copy of form submissions without
-- giving visitors read access to the enquiries table.
-- ---------------------------------------------------------------------------
create or replace function public.record_enquiry(p_kind text, p_name text, p_email text, p_phone text, p_subject text, p_details jsonb)
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
-- Storage: public bucket for website media; administrators manage objects.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qalbi-naturals-media', 'qalbi-naturals-media', true, 5242880, array['image/webp', 'image/png', 'image/jpeg', 'image/avif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "qalbi media: admin insert" on storage.objects;
create policy "qalbi media: admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'qalbi-naturals-media' and (select public.is_admin()));
drop policy if exists "qalbi media: admin update" on storage.objects;
create policy "qalbi media: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'qalbi-naturals-media' and (select public.is_admin()))
  with check (bucket_id = 'qalbi-naturals-media' and (select public.is_admin()));
drop policy if exists "qalbi media: admin delete" on storage.objects;
create policy "qalbi media: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'qalbi-naturals-media' and (select public.is_admin()));
-- Listing objects through the API (admin media library) needs a select policy;
-- public file URLs work without it because the bucket is public.
drop policy if exists "qalbi media: admin list" on storage.objects;
create policy "qalbi media: admin list" on storage.objects
  for select to authenticated using (bucket_id = 'qalbi-naturals-media' and (select public.is_admin()));

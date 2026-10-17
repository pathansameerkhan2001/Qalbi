-- =============================================================================
-- LEGACY — DO NOT RUN AGAINST PRODUCTION.
-- Written for an empty database. The QALBI production project already has its
-- own products/categories/product_images/store_settings tables; this file
-- conflicts with them. Use supabase/production/*.sql instead.
-- =============================================================================

-- =============================================================================
-- QALBI store — security & checkout tests (run against a database where the
-- migration and seed have been applied). Prints PASS/FAIL lines; any FAIL
-- raises at the end. Everything runs inside a transaction that is rolled back.
--
--   psql "$DATABASE_URL" -f supabase/tests/store_security_test.sql
-- =============================================================================
begin;

create temporary table results (n serial, name text, ok boolean, detail text) on commit drop;
grant all on results to anon, authenticated;
grant usage on sequence results_n_seq to anon, authenticated;

create or replace function pg_temp.check(name text, ok boolean, detail text default '') returns void language sql as
$$ insert into results (name, ok, detail) values (name, coalesce(ok, false), detail); $$;

-- Test users -----------------------------------------------------------------
insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000a001', 'admin@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000c001', 'customer@test.local', 'authenticated', 'authenticated');
insert into public.admin_users (user_id, email) values ('00000000-0000-0000-0000-00000000a001', 'admin@test.local');

update public.site_settings set value = '{"codEnabled": true, "phoneEnabled": true, "deliveryCharge": 50, "freeDeliveryOver": 1000}' where key = 'checkout';
update public.products set inventory = 3 where handle = 'moisturizer';

-- Helper: become a role with a JWT like PostgREST does ---------------------------
create or replace function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end $$;
create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true); -- older auth.uid() reads this form
  execute 'set local role authenticated';
end $$;

-- ---------------------------------------------------------------------------
-- 1. Anonymous visitor
-- ---------------------------------------------------------------------------
select pg_temp.as_anon();

select pg_temp.check('anon reads catalogue', (select count(*) = 5 from public.products));
select pg_temp.check('anon reads public settings', (select count(*) >= 1 from public.site_settings where key = 'checkout'));
select pg_temp.check('anon cannot read orders', (select count(*) = 0 from public.orders));
select pg_temp.check('anon cannot read admin_users', (select count(*) = 0 from public.admin_users));
select pg_temp.check('anon is not admin', not public.is_admin());

do $$ begin
  begin
    update public.products set price = 1 where handle = 'moisturizer';
    perform pg_temp.check('anon cannot change prices', (select price from public.products where handle = 'moisturizer') <> 1, 'update silently filtered by RLS');
  exception when others then perform pg_temp.check('anon cannot change prices', true, sqlerrm);
  end;
  begin
    insert into public.products (handle, title, price) values ('hack', 'Hack', 1);
    perform pg_temp.check('anon cannot insert products', false);
  exception when others then perform pg_temp.check('anon cannot insert products', true, sqlerrm);
  end;
  begin
    insert into public.orders (order_number, idempotency_key, payment_method, customer_name, phone, address_line1, city, state, postal_code, subtotal, total)
    values ('X', gen_random_uuid(), 'COD', 'x', '9999999999', 'street 1', 'city', 'state', '500001', 0, 0);
    perform pg_temp.check('anon cannot insert orders directly', false);
  exception when others then perform pg_temp.check('anon cannot insert orders directly', true, sqlerrm);
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('qalbi-naturals-media', 'uploads/evil.webp');
    perform pg_temp.check('anon cannot upload media', false);
  exception when others then perform pg_temp.check('anon cannot upload media', true, sqlerrm);
  end;
end $$;

-- place_order: valid COD order, priced from the database ------------------------
create temporary table placed as
select * from public.place_order(jsonb_build_object(
  'idempotencyKey', '11111111-1111-1111-1111-111111111111',
  'paymentMethod', 'COD',
  'customer', jsonb_build_object('name', 'Test Customer', 'phone', '+91 98765 43210', 'email', 'c@example.com',
    'addressLine1', '12 Rose Street', 'city', 'Hyderabad', 'state', 'Telangana', 'postalCode', '500001'),
  'items', jsonb_build_array(
    jsonb_build_object('productId', (select id from public.products where handle = 'radiance-glow-cream'), 'quantity', 1),
    jsonb_build_object('productId', (select id from public.products where handle = 'radiance-glow-cream'), 'quantity', 1))
));
grant select on placed to authenticated;
select pg_temp.check('COD order created', (select created and order_number like 'QN-%' from placed));
select pg_temp.check('duplicate lines merged and priced from DB: 2 × 399 + 50 delivery = 848', (select total = 848 from placed), (select total::text from placed));

select pg_temp.check('same idempotency key returns same order (no duplicate)',
  (select r.order_number = p.order_number and not r.created
     from placed p,
     lateral public.place_order(jsonb_build_object(
       'idempotencyKey', '11111111-1111-1111-1111-111111111111', 'paymentMethod', 'COD',
       'customer', jsonb_build_object('name', 'Test Customer', 'phone', '+91 98765 43210', 'addressLine1', '12 Rose Street', 'city', 'Hyderabad', 'state', 'Telangana', 'postalCode', '500001'),
       'items', jsonb_build_array(jsonb_build_object('productId', (select id from public.products where handle = 'radiance-glow-cream'), 'quantity', 1)))) r));

select pg_temp.check('customer can read own order with token',
  (select public.get_order_for_customer(order_number, access_token) ->> 'paymentStatus' = 'pending' from placed));
select pg_temp.check('COD order is NOT marked paid',
  (select public.get_order_for_customer(order_number, access_token) ->> 'paymentMethod' = 'COD'
      and public.get_order_for_customer(order_number, access_token) ->> 'paymentStatus' = 'pending' from placed));
select pg_temp.check('confirmation includes item image path',
  (select public.get_order_for_customer(order_number, access_token) -> 'items' -> 0 ->> 'imagePath' = 'products/radiance-studio.webp' from placed));
select pg_temp.check('wrong token reveals nothing',
  (select public.get_order_for_customer(order_number, gen_random_uuid()) is null from placed));

-- Free delivery threshold: 2 × 897 = 1794 ≥ 1000 → no delivery charge
select pg_temp.check('free delivery over threshold (PHONE order, 1794)',
  (select total = 1794 from public.place_order(jsonb_build_object(
    'idempotencyKey', gen_random_uuid(), 'paymentMethod', 'PHONE',
    'customer', jsonb_build_object('name', 'Phone Payer', 'phone', '9876543210', 'addressLine1', '5 Lotus Road', 'city', 'Mumbai', 'state', 'Maharashtra', 'postalCode', '400001'),
    'items', jsonb_build_array(jsonb_build_object('productId', (select id from public.products where handle = 'multipurpose-booster-serum'), 'quantity', 2))))));

-- Rejections
do $$
declare
  cust jsonb := jsonb_build_object('name', 'Test', 'phone', '9876543210', 'addressLine1', '12 Rose Street', 'city', 'Hyderabad', 'state', 'Telangana', 'postalCode', '500001');
  moist uuid := (select id from public.products where handle = 'moisturizer');
begin
  begin
    perform public.place_order(jsonb_build_object('idempotencyKey', gen_random_uuid(), 'paymentMethod', 'CARD', 'customer', cust, 'items', jsonb_build_array(jsonb_build_object('productId', moist, 'quantity', 1))));
    perform pg_temp.check('unknown payment method rejected', false);
  exception when others then perform pg_temp.check('unknown payment method rejected', sqlerrm like 'invalid_request%', sqlerrm);
  end;
  begin
    perform public.place_order(jsonb_build_object('idempotencyKey', gen_random_uuid(), 'paymentMethod', 'COD', 'customer', cust, 'items', jsonb_build_array(jsonb_build_object('productId', moist, 'quantity', 21))));
    perform pg_temp.check('quantity over 20 rejected', false);
  exception when others then perform pg_temp.check('quantity over 20 rejected', sqlerrm like 'invalid_request%', sqlerrm);
  end;
  begin
    perform public.place_order(jsonb_build_object('idempotencyKey', gen_random_uuid(), 'paymentMethod', 'COD', 'customer', cust, 'items', jsonb_build_array(jsonb_build_object('productId', gen_random_uuid(), 'quantity', 1))));
    perform pg_temp.check('unknown product rejected', false);
  exception when others then perform pg_temp.check('unknown product rejected', sqlerrm like 'product_unavailable%', sqlerrm);
  end;
  begin
    perform public.place_order(jsonb_build_object('idempotencyKey', gen_random_uuid(), 'paymentMethod', 'COD', 'customer', cust || '{"postalCode": "12"}', 'items', jsonb_build_array(jsonb_build_object('productId', moist, 'quantity', 1))));
    perform pg_temp.check('invalid PIN code rejected', false);
  exception when others then perform pg_temp.check('invalid PIN code rejected', sqlerrm like 'invalid_request%', sqlerrm);
  end;
  begin
    perform public.place_order(jsonb_build_object('idempotencyKey', gen_random_uuid(), 'paymentMethod', 'COD', 'customer', cust, 'items', jsonb_build_array(jsonb_build_object('productId', moist, 'quantity', 4))));
    perform pg_temp.check('insufficient stock rejected (4 > 3)', false);
  exception when others then perform pg_temp.check('insufficient stock rejected (4 > 3)', sqlerrm like 'insufficient_stock%', sqlerrm);
  end;
end $$;

-- Stock is reserved on order
create temporary table stock_order as
select * from public.place_order(jsonb_build_object(
  'idempotencyKey', gen_random_uuid(), 'paymentMethod', 'COD',
  'customer', jsonb_build_object('name', 'Stock Test', 'phone', '9876543210', 'addressLine1', '9 Neem Lane', 'city', 'Pune', 'state', 'Maharashtra', 'postalCode', '411001'),
  'items', jsonb_build_array(jsonb_build_object('productId', (select id from public.products where handle = 'moisturizer'), 'quantity', 3))));
grant select on stock_order to authenticated;
select pg_temp.check('stock reserved on order (3 → 0)', (select inventory = 0 from public.products where handle = 'moisturizer'));

select pg_temp.check('visitor can record an enquiry', (select true from (select public.record_enquiry('contact', 'Visitor', 'v@example.com', '', 'Hello', '{"Message": "Hi"}')) x));
select pg_temp.check('visitor cannot read enquiries', (select count(*) = 0 from public.enquiries));

reset role;

-- ---------------------------------------------------------------------------
-- 2. Signed-in customer who is not an administrator
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000c001');
select pg_temp.check('non-admin user is not admin', not public.is_admin());
select pg_temp.check('non-admin cannot read orders', (select count(*) = 0 from public.orders));
select pg_temp.check('non-admin cannot read enquiries', (select count(*) = 0 from public.enquiries));
select pg_temp.check('non-admin cannot see admin_users rows', (select count(*) = 0 from public.admin_users));
update public.orders set payment_status = 'paid';
select pg_temp.check('non-admin cannot mark orders paid', true, 'update affected no visible rows');
do $$ begin
  begin
    insert into public.site_settings (key, value) values ('checkout', '{"codEnabled": false}') on conflict (key) do update set value = excluded.value;
    perform pg_temp.check('non-admin cannot change settings', false);
  exception when others then perform pg_temp.check('non-admin cannot change settings', true, sqlerrm);
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('qalbi-naturals-media', 'uploads/x.webp');
    perform pg_temp.check('non-admin cannot upload media', false);
  exception when others then perform pg_temp.check('non-admin cannot upload media', true, sqlerrm);
  end;
end $$;
reset role;
select pg_temp.check('non-admin update really changed nothing', (select count(*) = 0 from public.orders where payment_status = 'paid'));

-- ---------------------------------------------------------------------------
-- 3. Administrator
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
select pg_temp.check('admin is admin', public.is_admin());
select pg_temp.check('admin sees own admin row', (select count(*) = 1 from public.admin_users));
select pg_temp.check('admin reads orders', (select count(*) = 3 from public.orders));
select pg_temp.check('admin reads order items', (select count(*) >= 3 from public.order_items));
select pg_temp.check('admin reads enquiries', (select count(*) = 1 from public.enquiries));

update public.orders set status = 'cancelled' where order_number = (select order_number from stock_order);
select pg_temp.check('cancelling returns reserved stock (0 → 3)', (select inventory = 3 from public.products where handle = 'moisturizer'));
update public.orders set status = 'pending' where order_number = (select order_number from stock_order);
update public.orders set status = 'cancelled' where order_number = (select order_number from stock_order);
select pg_temp.check('stock is returned only once', (select inventory = 3 from public.products where handle = 'moisturizer'));

update public.orders set payment_status = 'paid', status = 'delivered' where order_number = (select order_number from placed);
select pg_temp.check('admin can mark a COD order paid after delivery', (select payment_status = 'paid' from public.orders where order_number = (select order_number from placed)));

update public.products set price = 449 where handle = 'radiance-glow-cream';
select pg_temp.check('admin can update prices', (select price = 449 from public.products where handle = 'radiance-glow-cream'));
select pg_temp.check('existing order keeps its original price snapshot', (select unit_price = 399 from public.order_items i join public.orders o on o.id = i.order_id where o.order_number = (select order_number from placed) limit 1));

insert into public.site_settings (key, value) values ('checkout', '{"codEnabled": false, "phoneEnabled": true, "deliveryCharge": 0, "freeDeliveryOver": null}')
  on conflict (key) do update set value = excluded.value;
select pg_temp.check('admin can change settings', (select (value ->> 'codEnabled')::boolean = false from public.site_settings where key = 'checkout'));
insert into storage.objects (bucket_id, name) values ('qalbi-naturals-media', 'uploads/products/ok.webp');
select pg_temp.check('admin can upload media', true);
reset role;

-- Disabled payment method is enforced by the database
select pg_temp.as_anon();
do $$ begin
  perform public.place_order(jsonb_build_object('idempotencyKey', gen_random_uuid(), 'paymentMethod', 'COD',
    'customer', jsonb_build_object('name', 'Late', 'phone', '9876543210', 'addressLine1', '1 Main Road', 'city', 'Delhi', 'state', 'Delhi', 'postalCode', '110001'),
    'items', jsonb_build_array(jsonb_build_object('productId', (select id from public.products where handle = 'facial-cleanser'), 'quantity', 1))));
  perform pg_temp.check('disabled COD is rejected', false);
exception when others then perform pg_temp.check('disabled COD is rejected', sqlerrm = 'payment_method_disabled', sqlerrm);
end $$;
reset role;

-- Report -----------------------------------------------------------------------
select case when ok then 'PASS' else 'FAIL' end as result, name, nullif(detail, '') as detail from results order by n;
do $$ begin
  if exists (select 1 from results where not ok) then raise exception '% test(s) failed', (select count(*) from results where not ok); end if;
end $$;
rollback;

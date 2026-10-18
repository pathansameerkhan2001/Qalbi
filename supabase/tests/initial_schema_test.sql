-- =============================================================================
-- LOCAL ONLY — security & checkout tests for migrations/20261018000000_initial_schema.sql.
-- Run against a LOCAL database with the migration applied (never production):
--   psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/initial_schema_test.sql
-- Everything runs in one transaction that is rolled back. Prints PASS/FAIL
-- lines and raises at the end if anything failed.
-- =============================================================================
begin;

create temporary table results (n serial, name text, ok boolean, detail text);
grant all on results to public;
grant usage on sequence results_n_seq to public;

create function pg_temp.check(name text, ok boolean, detail text default '') returns void language sql as
$$ insert into results (name, ok, detail) values (name, coalesce(ok, false), detail); $$;

-- Expects the statement to fail; records PASS with the error message.
create function pg_temp.denied(name text, stmt text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    perform pg_temp.check(name, true, sqlerrm);
    return;
  end;
  perform pg_temp.check(name, false, 'statement succeeded');
end $$;

-- Expects the statement to succeed.
create function pg_temp.allowed(name text, stmt text) returns void language plpgsql as $$
begin
  execute stmt;
  perform pg_temp.check(name, true);
exception when others then
  perform pg_temp.check(name, false, sqlerrm);
end $$;

-- Expects an UPDATE/DELETE to affect 0 rows (RLS filters rather than errors).
create function pg_temp.no_rows(name text, stmt text) returns void language plpgsql as $$
declare n integer;
begin
  execute stmt;
  get diagnostics n = row_count;
  perform pg_temp.check(name, n = 0, n || ' rows affected');
exception when others then
  perform pg_temp.check(name, true, sqlerrm);
end $$;

create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;
create function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  execute 'set local role authenticated';
end $$;
create function pg_temp.as_server() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role service_role';
end $$;

-- Fixtures (test-only, rolled back) -------------------------------------------
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000a001', 'admin@test.local', now()),
  ('00000000-0000-0000-0000-00000000c001', 'customer@test.local', now());
insert into public.admin_users (user_id, email) values ('00000000-0000-0000-0000-00000000a001', 'admin@test.local');

-- ---------------------------------------------------------------------------
-- 1. Administrator manages the catalogue
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
select pg_temp.check('admin: is_admin() true', public.is_admin());
select pg_temp.check('admin: reads own admin row', (select count(*) = 1 from public.admin_users));
select pg_temp.allowed('admin: create category',
  $$insert into public.categories (id, name, slug, description, image_url, sort_order, is_active)
    values ('00000000-0000-0000-0000-0000000000c1', 'Face', 'face', null, 'uploads/categories/face.webp', 1, true)$$);
select pg_temp.allowed('admin: create published product',
  $$insert into public.products (id, category_id, name, slug, description, price, compare_at_price, stock_quantity, sku, is_published)
    values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'Test Serum', 'test-serum', '', 500, 600, 3, 'T-1', true)$$);
select pg_temp.allowed('admin: create draft product',
  $$insert into public.products (id, name, slug, price, is_published)
    values ('00000000-0000-0000-0000-0000000000d1', 'Draft', 'draft', 100, false)$$);
select pg_temp.allowed('admin: add product images',
  $$insert into public.product_images (product_id, image_url, alt_text, sort_order, is_primary) values
    ('00000000-0000-0000-0000-0000000000b1', 'uploads/products/a.webp', 'A', 0, true),
    ('00000000-0000-0000-0000-0000000000b1', 'uploads/products/b.webp', 'B', 1, false)$$);
select pg_temp.denied('admin: second primary image rejected',
  $$insert into public.product_images (product_id, image_url, sort_order, is_primary)
    values ('00000000-0000-0000-0000-0000000000b1', 'uploads/products/c.webp', 2, true)$$);
select pg_temp.denied('admin: compare-at price must exceed price',
  $$update public.products set compare_at_price = 400 where slug = 'test-serum'$$);
select pg_temp.denied('admin: duplicate slug rejected',
  $$insert into public.products (name, slug, price) values ('Dup', 'test-serum', 1)$$);
select pg_temp.allowed('admin: update product (updated_at trigger)',
  $$update public.products set description = 'Updated' where slug = 'test-serum'$$);
select pg_temp.check('admin: sees draft product', (select count(*) = 2 from public.products));
select pg_temp.denied('admin: delete category with products → restrict',
  $$delete from public.categories where slug = 'face'$$);
select pg_temp.allowed('admin: save brand_claims setting',
  $$insert into public.store_settings (setting_key, setting_value) values ('brand_claims', '{"verified": false, "note": ""}')$$);
select pg_temp.check('admin: checkout starts closed',
  (select setting_value = '{"codEnabled": false, "phoneEnabled": false, "deliveryCharge": 0, "freeDeliveryOver": null, "qrImagePath": null}'::jsonb
     from public.store_settings where setting_key = 'checkout'));

-- Privilege escalation attempts by an administrator
select pg_temp.denied('admin: cannot add administrators', $$insert into public.admin_users (user_id, email) values ('00000000-0000-0000-0000-00000000c001', 'x')$$);
select pg_temp.denied('admin: cannot call place_order directly', $$select * from public.place_order('{}')$$);
select pg_temp.denied('admin: cannot call place_order_checked', $$select * from public.place_order_checked('{}', repeat('a', 64))$$);
select pg_temp.denied('admin: cannot truncate products', $$truncate public.products cascade$$);

-- Storage
select pg_temp.allowed('admin: upload to qalbi-naturals-media',
  $$insert into storage.objects (bucket_id, name) values ('qalbi-naturals-media', 'uploads/products/new.webp')$$);
select pg_temp.allowed('admin: replace (upsert) in qalbi-naturals-media',
  $$insert into storage.objects (bucket_id, name, metadata) values ('qalbi-naturals-media', 'uploads/products/new.webp', '{"v":2}')
    on conflict (bucket_id, name) do update set metadata = excluded.metadata$$);
select pg_temp.check('admin: list qalbi-naturals-media', (select count(*) = 1 from storage.objects where bucket_id = 'qalbi-naturals-media'));
select pg_temp.denied('admin: cannot upload to another bucket',
  $$insert into storage.objects (bucket_id, name) values ('other-bucket', 'x.webp')$$);

-- ---------------------------------------------------------------------------
-- 2. Anonymous visitor (publishable key)
-- ---------------------------------------------------------------------------
select pg_temp.as_anon();
select pg_temp.check('anon: is_admin() false', not public.is_admin());
select pg_temp.check('anon: sees published product only', (select count(*) = 1 from public.products));
select pg_temp.check('anon: sees images of published product', (select count(*) = 2 from public.product_images));
select pg_temp.check('anon: sees active category', (select count(*) = 1 from public.categories));
select pg_temp.check('anon: reads checkout setting', (select count(*) = 1 from public.store_settings where setting_key = 'checkout'));
select pg_temp.check('anon: cannot read brand_claims', (select count(*) = 0 from public.store_settings where setting_key = 'brand_claims'));
select pg_temp.denied('anon: cannot read admin_users', $$select 1 from public.admin_users$$);
select pg_temp.denied('anon: cannot read orders', $$select 1 from public.orders$$);
select pg_temp.denied('anon: cannot read enquiries', $$select 1 from public.enquiries$$);
select pg_temp.denied('anon: cannot read throttle counters', $$select 1 from public.request_throttle$$);
select pg_temp.denied('anon: cannot insert products', $$insert into public.products (name, slug, price) values ('Hack', 'hack', 1)$$);
select pg_temp.denied('anon: cannot change prices', $$update public.products set price = 1$$);
select pg_temp.denied('anon: cannot change checkout settings', $$update public.store_settings set setting_value = '{"codEnabled": true}'$$);
select pg_temp.denied('anon: cannot insert orders directly',
  $$insert into public.orders (order_number, idempotency_key, payment_method, customer_name, phone, address_line1, city, state, postal_code, subtotal, total)
    values ('X', gen_random_uuid(), 'COD', 'x', '9999999999', 'street 1', 'city', 'state', '500001', 0, 0)$$);
select pg_temp.denied('anon: cannot call place_order', $$select * from public.place_order('{}')$$);
select pg_temp.denied('anon: cannot call place_order_checked', $$select * from public.place_order_checked('{}', repeat('a', 64))$$);
select pg_temp.denied('anon: cannot call record_enquiry', $$select public.record_enquiry('contact', 'Spam', '', '', '', '{}')$$);
select pg_temp.denied('anon: cannot call record_enquiry_checked', $$select public.record_enquiry_checked(repeat('a', 64), 'contact', 'Spam', '', '', '', '{}')$$);
select pg_temp.denied('anon: cannot call throttle_hit', $$select public.throttle_hit('x', 1, interval '1 hour')$$);
select pg_temp.denied('anon: cannot use order number sequence', $$select nextval('public.order_number_seq')$$);
select pg_temp.denied('anon: cannot upload media', $$insert into storage.objects (bucket_id, name) values ('qalbi-naturals-media', 'uploads/evil.webp')$$);
select pg_temp.check('anon: cannot list media', (select count(*) = 0 from storage.objects));
select pg_temp.no_rows('anon: cannot delete media', $$delete from storage.objects$$);

-- ---------------------------------------------------------------------------
-- 3. Signed-in customer (not an administrator)
-- ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000c001');
select pg_temp.check('user: is_admin() false', not public.is_admin());
select pg_temp.check('user: sees no admin rows', (select count(*) = 0 from public.admin_users));
select pg_temp.denied('user: cannot make self admin', $$insert into public.admin_users (user_id, email) values ('00000000-0000-0000-0000-00000000c001', 'me')$$);
select pg_temp.denied('user: cannot insert products', $$insert into public.products (name, slug, price) values ('Hack', 'hack', 1)$$);
select pg_temp.no_rows('user: cannot change prices', $$update public.products set price = 1$$);
select pg_temp.no_rows('user: cannot delete products', $$delete from public.products$$);
select pg_temp.check('user: cannot see draft product', (select count(*) = 1 from public.products));
select pg_temp.check('user: cannot read orders', (select count(*) = 0 from public.orders));
select pg_temp.check('user: cannot read enquiries', (select count(*) = 0 from public.enquiries));
select pg_temp.denied('user: cannot upload media', $$insert into storage.objects (bucket_id, name) values ('qalbi-naturals-media', 'uploads/evil.webp')$$);
select pg_temp.check('user: cannot list media', (select count(*) = 0 from storage.objects));
select pg_temp.no_rows('user: cannot overwrite media', $$update storage.objects set metadata = '{}'$$);
select pg_temp.no_rows('user: cannot delete media', $$delete from storage.objects$$);
select pg_temp.denied('user: cannot call place_order_checked', $$select * from public.place_order_checked('{}', repeat('a', 64))$$);

-- ---------------------------------------------------------------------------
-- 4. Checkout through the server key
-- ---------------------------------------------------------------------------
create temporary table order_result (order_number text, access_token uuid, total numeric, created boolean);
grant all on order_result to public;
create function pg_temp.order_payload(key text, method text, product text, qty text, phone text default '9876543210') returns jsonb language sql as $$
  select jsonb_build_object(
    'idempotencyKey', key, 'paymentMethod', method,
    'customer', jsonb_build_object('name', 'Test Buyer', 'phone', phone, 'email', '', 'addressLine1', '12 Test Street',
                                   'addressLine2', '', 'city', 'Hyderabad', 'state', 'Telangana', 'postalCode', '500001', 'notes', ''),
    'items', jsonb_build_array(jsonb_build_object('productId', product, 'quantity', qty::jsonb, 'price', 1)))
$$;

select pg_temp.as_server();
select pg_temp.denied('server: COD refused while checkout is closed',
  $$select * from public.place_order_checked(pg_temp.order_payload('11111111-1111-1111-1111-111111111111', 'COD', '00000000-0000-0000-0000-0000000000b1', '1'), repeat('a', 64))$$);
select pg_temp.denied('server: QR refused while checkout is closed',
  $$select * from public.place_order_checked(pg_temp.order_payload('11111111-1111-1111-1111-111111111112', 'PHONE', '00000000-0000-0000-0000-0000000000b1', '1'), repeat('a', 64))$$);

-- Administrator opens COD only (as /admin/settings would).
select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
update public.store_settings set setting_value = setting_value || '{"codEnabled": true}' where setting_key = 'checkout';

select pg_temp.as_server();
select pg_temp.denied('server: QR still refused without QR image',
  $$select * from public.place_order_checked(pg_temp.order_payload('11111111-1111-1111-1111-111111111113', 'PHONE', '00000000-0000-0000-0000-0000000000b1', '1'), repeat('a', 64))$$);
select pg_temp.denied('server: draft product unavailable',
  $$select * from public.place_order_checked(pg_temp.order_payload('11111111-1111-1111-1111-111111111114', 'COD', '00000000-0000-0000-0000-0000000000d1', '1'), repeat('a', 64))$$);
select pg_temp.denied('server: more than stock refused',
  $$select * from public.place_order_checked(pg_temp.order_payload('11111111-1111-1111-1111-111111111115', 'COD', '00000000-0000-0000-0000-0000000000b1', '4'), repeat('a', 64))$$);
select pg_temp.denied('server: malformed product id refused',
  $$select * from public.place_order_checked(pg_temp.order_payload('11111111-1111-1111-1111-111111111116', 'COD', 'not-a-uuid', '1'), repeat('a', 64))$$);
select pg_temp.denied('server: fractional quantity refused',
  $$select * from public.place_order_checked(pg_temp.order_payload('11111111-1111-1111-1111-111111111117', 'COD', '00000000-0000-0000-0000-0000000000b1', '1.5'), repeat('a', 64))$$);
select pg_temp.denied('server: invalid client key refused',
  $$select * from public.place_order_checked(pg_temp.order_payload('11111111-1111-1111-1111-111111111118', 'COD', '00000000-0000-0000-0000-0000000000b1', '1'), 'x')$$);

insert into order_result
  select * from public.place_order_checked(pg_temp.order_payload('22222222-2222-2222-2222-222222222222', 'COD', '00000000-0000-0000-0000-0000000000b1', '2'), repeat('b', 64));
select pg_temp.check('server: COD order placed', (select created and total = 1000 from order_result));
insert into order_result
  select * from public.place_order_checked(pg_temp.order_payload('22222222-2222-2222-2222-222222222222', 'COD', '00000000-0000-0000-0000-0000000000b1', '2'), repeat('b', 64));
select pg_temp.check('server: retry with same key returns same order', (select count(distinct order_number) = 1 and bool_or(not created) from order_result));

select pg_temp.as_anon();
select pg_temp.check('anon: confirmation with token works',
  (select public.get_order_for_customer(r.order_number, r.access_token) ->> 'total' = '1000.00' from order_result r limit 1));
select pg_temp.check('anon: confirmation with wrong token returns nothing',
  (select public.get_order_for_customer(r.order_number, gen_random_uuid()) is null from order_result r limit 1));

select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
select pg_temp.check('admin: price came from the database, stock reserved',
  (select i.unit_price = 500 and i.line_total = 1000 and p.stock_quantity = 1
     from public.order_items i join public.products p on p.id = i.product_id));
select pg_temp.denied('admin: cannot change order total', $$update public.orders set total = 1$$);
select pg_temp.denied('admin: cannot delete orders', $$delete from public.orders$$);
select pg_temp.allowed('admin: confirm order and mark paid', $$update public.orders set status = 'confirmed', payment_status = 'paid'$$);
select pg_temp.allowed('admin: cancel order', $$update public.orders set status = 'cancelled'$$);
select pg_temp.check('admin: cancel returned stock', (select stock_quantity = 3 from public.products where slug = 'test-serum'));
select pg_temp.denied('admin: cancelled order cannot be reopened', $$update public.orders set status = 'pending'$$);
select pg_temp.allowed('admin: delete product (images first, as the admin panel does)',
  $$delete from public.product_images where product_id = '00000000-0000-0000-0000-0000000000b1';
    delete from public.products where slug = 'test-serum'$$);
select pg_temp.check('admin: order history kept after product delete',
  (select product_id is null and title = 'Test Serum' and product_handle = 'test-serum' from public.order_items));

-- Rate limits
select pg_temp.as_server();
select pg_temp.allowed('server: enquiry stored',
  $$select public.record_enquiry_checked(repeat('c', 64), 'contact', 'Test Person', 'a@b.co', '', 'Hello', '{"Message": "hi"}')$$);
select pg_temp.denied('server: enquiry with invalid kind refused',
  $$select public.record_enquiry_checked(repeat('c', 64), 'other', 'Test Person', '', '', '', '{}')$$);
do $$ begin for i in 1..10 loop perform public.record_enquiry_checked(repeat('d', 64), 'contact', 'Test Person', '', '', '', '{}'); end loop; end $$;
select pg_temp.denied('server: 11th enquiry in an hour from one client is rate limited',
  $$select public.record_enquiry_checked(repeat('d', 64), 'contact', 'Test Person', '', '', '', '{}')$$);

select pg_temp.as_user('00000000-0000-0000-0000-00000000a001');
select pg_temp.allowed('admin: mark enquiry handled', $$update public.enquiries set handled = true$$);
select pg_temp.denied('admin: cannot edit enquiry contents', $$update public.enquiries set name = 'x'$$);

-- ---------------------------------------------------------------------------
reset role;
select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail from results order by n;
do $$
declare failed integer := (select count(*) from results where not ok);
begin
  if failed > 0 then raise exception '% test(s) failed', failed; end if;
  raise notice 'All % tests passed', (select count(*) from results);
end $$;

rollback;

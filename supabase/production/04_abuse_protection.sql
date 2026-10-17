-- =============================================================================
-- 04 — ABUSE PROTECTION FOR ORDERS AND ENQUIRIES (run after 01)
--
-- Problem: after 01, anyone holding the public (publishable) key can call
-- place_order() and record_enquiry() directly, skipping the website, with no
-- limit — enough to reserve all stock with fake orders or flood enquiries.
--
-- What it changes
--   • place_order() and record_enquiry() can no longer be called through the
--     public API (anon / authenticated lose EXECUTE).
--   • Two wrappers, place_order_checked() and record_enquiry_checked(), are the
--     only entry points. They are executable ONLY by service_role, i.e. by the
--     website's server code holding the server-only secret key, and they apply
--     rate limits stored in the database:
--       orders:    5 per client per hour · 3 pending orders per phone number
--                  per 24 hours · 60 per hour in total (circuit breaker)
--       enquiries: 10 per client per hour · 200 per hour in total
--     "client" is an HMAC of the visitor's IP computed by the website server.
--     Retrying an order with the same idempotency key is never counted.
--   • New table request_throttle (counters only, no personal data): RLS on,
--     no policies, no API-role privileges.
--
-- What it does NOT change: 01's functions, tables, policies or data; the
-- bucket; get_order_for_customer() (stays callable with the secret order token).
--
-- Until the website is deployed with SUPABASE_SERVICE_ROLE_KEY set, nothing
-- can create orders or store enquiries — checkout stays fully closed.
-- Rollback: 98_rollback_abuse_protection.sql (safe at any time).
-- =============================================================================

begin;

create table public.request_throttle (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);
alter table public.request_throttle enable row level security;
revoke all on public.request_throttle from anon, authenticated;

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
revoke all on function public.throttle_hit(text, integer, interval) from public, anon, authenticated;

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

-- Public API: no direct order or enquiry creation any more.
revoke all on function public.place_order(jsonb) from public, anon, authenticated;
revoke all on function public.record_enquiry(text, text, text, text, text, jsonb) from public, anon, authenticated;
-- Only the website server (secret key → service_role) may use the wrappers.
revoke all on function public.place_order_checked(jsonb, text) from public, anon, authenticated;
revoke all on function public.record_enquiry_checked(text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.place_order_checked(jsonb, text) to service_role;
grant execute on function public.record_enquiry_checked(text, text, text, text, text, text, jsonb) to service_role;

commit;

-- ---------------------------------------------------------------------------
-- Read-only verification after commit
-- ---------------------------------------------------------------------------
-- select p.proname,
--        has_function_privilege('anon', p.oid, 'EXECUTE')          as anon,
--        has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated,
--        has_function_privilege('service_role', p.oid, 'EXECUTE')  as service_role
--   from pg_proc p where p.pronamespace = 'public'::regnamespace
--    and p.proname in ('place_order','record_enquiry','place_order_checked','record_enquiry_checked','throttle_hit','get_order_for_customer')
--  order by 1;
-- expect: place_order, record_enquiry, throttle_hit → f/f/(t, harmless: owner-level role)
--         place_order_checked, record_enquiry_checked → f/f/t
--         get_order_for_customer → t/t/t

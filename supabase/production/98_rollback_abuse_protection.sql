-- =============================================================================
-- 98 — ROLLBACK OF 04 (safe at any time; removes only rate-limit counters)
--
-- Restores the state after 01: place_order() and record_enquiry() become
-- callable through the public API again (WITHOUT rate limits). Prefer turning
-- Cash on Delivery off in /admin/settings if you only need to stop orders.
-- Run 98 before 99 if you ever roll back 01 as well.
-- =============================================================================

begin;

drop function public.place_order_checked(jsonb, text);
drop function public.record_enquiry_checked(text, text, text, text, text, text, jsonb);
drop function public.throttle_hit(text, integer, interval);
drop table public.request_throttle;

grant execute on function public.place_order(jsonb) to anon, authenticated;
grant execute on function public.record_enquiry(text, text, text, text, text, jsonb) to anon, authenticated;

commit;

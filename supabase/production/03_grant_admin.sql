-- =============================================================================
-- 03 — GRANT ADMINISTRATOR ACCESS (run after 01 is applied and verified)
--
-- Authorisation is by Supabase Auth user id only. The email is copied from
-- auth.users for display. Only a confirmed, non-banned account is granted.
-- Expect exactly 1 row back; 0 rows = user missing, unconfirmed or banned.
-- =============================================================================

insert into public.admin_users (user_id, email)
select u.id, u.email
from auth.users u
where u.id = '59dc53a4-8928-4e95-a183-539bc9f79309'
  and u.email_confirmed_at is not null
  and (u.banned_until is null or u.banned_until < now())
on conflict (user_id) do nothing
returning user_id, email;

-- Revoke:
-- delete from public.admin_users where user_id = '59dc53a4-8928-4e95-a183-539bc9f79309';

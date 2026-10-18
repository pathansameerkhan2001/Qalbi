-- =============================================================================
-- GRANT ADMINISTRATOR ACCESS (run after migrations/20261018000000_initial_schema.sql)
--
-- 1. Create the administrator account in Supabase → Authentication → Users
--    (or let them sign up) and make sure the email is confirmed.
-- 2. Find the account's user id (read-only):
--      select id, email, email_confirmed_at is not null as confirmed, banned_until, deleted_at
--      from auth.users where email = '<admin email>';
-- 3. Replace <ADMIN_USER_ID> below with that id and run this script.
--    While the placeholder is still there the script fails and changes nothing.
--
-- Only a confirmed, non-banned, non-deleted account is granted. Expect exactly
-- 1 row back; 0 rows = user missing, unconfirmed, banned, deleted or already an
-- administrator.
-- =============================================================================

insert into public.admin_users (user_id, email)
select u.id, u.email
from auth.users u
where u.id = '<ADMIN_USER_ID>'::uuid
  and u.email_confirmed_at is not null
  and (u.banned_until is null or u.banned_until < now())
  and u.deleted_at is null
on conflict (user_id) do nothing
returning user_id, email;

-- Revoke:
-- delete from public.admin_users where user_id = '<ADMIN_USER_ID>';

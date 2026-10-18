-- =============================================================================
-- GRANT ADMINISTRATOR ACCESS (run after migrations/20261018000000_initial_schema.sql)
--
-- Project: pcvzyjhlruricsanzuao (QALBI Naturals). Check the project ID in the
-- dashboard URL before running.
--
-- Grants administrator access to the verified Supabase Auth account:
--   user id: 5b6432de-6362-4548-84af-52b952b0c5a7
--   email:   qalbinaturals@gmail.com
--
-- Optional read-only check first:
--   select id, email, email_confirmed_at is not null as confirmed, banned_until, deleted_at
--   from auth.users where id = '5b6432de-6362-4548-84af-52b952b0c5a7';
--
-- Only granted when the id AND email both match one account that is confirmed,
-- not banned and not deleted. An existing admin row is never overwritten.
-- Expect exactly 1 row back; 0 rows = user missing, email mismatch,
-- unconfirmed, banned, deleted or already an administrator.
-- =============================================================================

insert into public.admin_users (user_id, email)
select u.id, u.email
from auth.users u
where u.id = '5b6432de-6362-4548-84af-52b952b0c5a7'::uuid
  and lower(u.email) = 'qalbinaturals@gmail.com'
  and u.email_confirmed_at is not null
  and (u.banned_until is null or u.banned_until < now())
  and u.deleted_at is null
on conflict (user_id) do nothing
returning user_id, email;

-- Confirm afterwards (read-only):
-- select user_id, email, created_at from public.admin_users;

-- Revoke:
-- delete from public.admin_users where user_id = '5b6432de-6362-4548-84af-52b952b0c5a7';

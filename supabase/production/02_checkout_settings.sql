-- =============================================================================
-- 02 — CHECKOUT SETTINGS (run after 01)
--
-- Confirmed defaults: Cash on Delivery ON, QR payment OFF, delivery ₹0.
-- QR payment stays off until the real QR image is uploaded and its path is
-- saved in /admin/settings (the database refuses QR orders without it).
-- Inserts only when no 'checkout' row exists; never overwrites.
-- =============================================================================

insert into public.store_settings (setting_key, setting_value)
select 'checkout',
       '{"codEnabled": true, "phoneEnabled": false, "deliveryCharge": 0, "freeDeliveryOver": null, "qrImagePath": null}'::jsonb
where not exists (select 1 from public.store_settings where setting_key = 'checkout')
returning id, setting_key, setting_value;

-- Rollback (only if this script inserted the row):
-- delete from public.store_settings where setting_key = 'checkout' and id = '<id returned above>';

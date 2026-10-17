# QALBI Naturals — Storefront

Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · Shopify Storefront API.

## Run

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev                  # http://localhost:3000
npm run lint && npx tsc --noEmit && npm run build
```

Without Shopify credentials the site runs in **store preview** mode: QALBI's real products and photos with **unconfirmed preview prices**, a cookie-backed demo bag, and checkout disabled.

## Go-live checklist

| Item | Where |
| --- | --- |
| Shopify credentials | `.env.local` / Vercel env (`SHOPIFY_*`) — fixtures switch off automatically; set `COMMERCE_DISABLE_FIXTURES=true` in production |
| Collection handles | Must match `src/data/navigation.ts` and `src/data/categories.ts` (plus `bestsellers` for the homepage) |
| Product ingredients / directions / warnings | Shopify metafields `qalbi.ingredients`, `qalbi.directions`, `qalbi.warnings` |
| Ratings | Shopify metafields `reviews.rating`, `reviews.rating_count` (written by review apps) |
| Ingredients PDF | Put in `public/documents/`, set `ingredientsPdfUrl` in `src/data/brand.ts` |
| Ingredient ↔ product links | `productHandles` in `src/data/ingredients.ts` (only from confirmed formulations) |
| Certification badges | Set `verified: true` in `src/data/trust-badges.ts` only once documented |
| Instagram Reels | `INSTAGRAM_ACCESS_TOKEN`, or real Reel URLs + thumbnails in `manualReels` (`src/data/content.ts`) |
| Journal | `SHOPIFY_BLOG_HANDLE`, or real articles in `journalArticles` |
| Reviews | Genuine, permitted feedback in `reviews` |
| Enquiry / contact / newsletter delivery | `RESEND_API_KEY` + `FORMS_FROM_EMAIL`, and/or `ENQUIRY_WEBHOOK_URL` / `NEWSLETTER_WEBHOOK_URL` |
| Policies | Fill Shopify admin → Settings → Policies (rendered at `/policies/*`) |
| Catalogue refresh | Shopify webhook → `POST /api/revalidate?secret=SHOPIFY_REVALIDATION_SECRET` |

## Images & Supabase Storage

All website images are crops of QALBI's own photographs and logo (`assets-source/client-photos/`).

```bash
npm run assets:build    # crops/optimises originals → public/assets/** (see scripts/process-images.py)
npm run assets:upload   # uploads public/assets/** to the Supabase bucket and verifies each public URL
```

- Bucket: `qalbi-naturals-media` (public). Object paths mirror `public/assets`: `brand/*` (logo + logo mask), `hero/*` (3 slides × desktop/mobile), `products/*`, `categories/*`, `ingredients/*`, `about/*`, `lookbook/*`, `reels/*`, `miscellaneous/*`.
- Needs `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Creating the bucket, or uploading under default Storage policies, needs `SUPABASE_SERVICE_ROLE_KEY` in the **local/server** environment only (never `NEXT_PUBLIC_`). Alternatively create the public bucket in the dashboard.
- After a fully verified upload set `NEXT_PUBLIC_ASSET_SOURCE=supabase`; the site then loads every image from Supabase (`src/lib/assets.ts`). Until then identical local copies are served.
- Every image is referenced by purpose in `src/data/images.ts` — no hard-coded URLs in components.

## Admin panel, orders & checkout (Supabase)

The production Supabase project already has its own `products`, `categories`, `product_images` and `store_settings` tables. The website uses them as they are. **Never run the files in `supabase/legacy/`** — they were written for an empty database and conflict with those tables.

Run these in Supabase → SQL Editor, in order (each is reviewed SQL in `supabase/production/`):

| File | What it does |
|---|---|
| `00_preflight_readonly.sql` | Read-only checks. Run each query separately (select it, then Run). |
| `01_store_additions.sql` | One transaction: adds `admin_users`, `orders`, `order_items`, `enquiries`, the checkout functions, RLS policies and `updated_at` triggers. Changes no existing column, constraint, row or bucket setting. |
| `02_checkout_settings.sql` | Checkout defaults: Cash on Delivery on, UPI QR off, delivery ₹0. Never overwrites an existing row. |
| `03_grant_admin.sql` | Makes the verified Supabase Auth user (by user id) an administrator. |
| `04_abuse_protection.sql` | Orders/enquiries only via the website server, with database rate limits. Rollback: `98_rollback_abuse_protection.sql`. |
| `99_rollback.sql` | Undoes 01 (refuses once orders or enquiries exist). |

Then set `COMMERCE_SOURCE=supabase` to sell the products managed in `/admin` (ignored while Shopify is configured), and sign in at `/admin/login`.

**UPI QR payment:** upload the real QR image in `/admin/media`, paste its path in Settings → Checkout, then switch QR payment on. The database refuses QR orders until both are set. Customers see the QR after placing the order; the order stays **pending** until you check your bank app and mark it paid in `/admin/orders`. Nothing marks an order paid automatically.

**Images:** `npm run assets:upload` copies `public/assets/**` into the bucket (needs `SUPABASE_SERVICE_ROLE_KEY` locally); then set `NEXT_PUBLIC_ASSET_SOURCE=supabase`. New images can also be uploaded in `/admin/media` (stored under `uploads/`).

**How it is secured:** signing in is not enough. Every admin page and server action checks the Supabase session with the Auth server *and* the user's row in `admin_users` (`src/lib/admin/auth.ts`); a non-admin is signed straight back out. The database enforces the same rule with RLS through `public.is_admin()`, which uses the verified `auth.uid()` — never an email or id sent by the browser. Visitors can read only published products, active categories and the storefront's setting keys. Orders are priced only inside `place_order()`; the browser never sends prices. The order confirmation page is unlocked by a random token kept in an httpOnly cookie. Orders and enquiries can be created only by the website server: `place_order_checked()` / `record_enquiry_checked()` are executable solely with the server-only `SUPABASE_SERVICE_ROLE_KEY` and enforce rate limits in the database (`04_abuse_protection.sql`). That key is used for nothing else — admin pages and actions run as the signed-in administrator under RLS.

**WhatsApp:** after an order, the confirmation page offers *Confirm Order on WhatsApp*, which opens WhatsApp with the order number, items, total and product image links pre-filled for the customer to send. Automatic business-sent WhatsApp messages would need the WhatsApp Business Platform (not configured).

**Tests:** `npm test` (checkout validation and WhatsApp message).

## Structure

- `src/app/(site)` — storefront routes; `src/app/admin` — admin panel (`/admin`, `/admin/login`, orders, products, categories, ingredients, media, enquiries, settings); `src/app/checkout` lives in `(site)`
- `src/app` — routes (`/`, `/products`, `/products/[handle]`, `/collections/[handle]`, `/search`, `/cart`, `/about`, `/ingredients`, `/customised-skincare`, `/journal`, `/journal/[slug]`, `/contact`, `/reviews`, `/faqs`, `/policies/[slug]`, `/account`, API routes)
- `src/components` — `layout`, `home`, `products`, `cart`, `forms`, `ui`
- `src/lib/shopify` — typed Storefront client, queries, mappers, cached catalogue API
- `src/lib/cart/actions.ts` — cart server actions (Shopify cart or dev cart)
- `src/data` — brand config, navigation, content, fixtures, image map

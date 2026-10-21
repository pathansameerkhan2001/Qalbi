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

## Admin panel, products & checkout (Supabase)

**Database setup (project `pcvzyjhlruricsanzuao`).** Run these in Supabase → SQL Editor, in this order, each file pasted whole and run once. Each is one transaction that stops without changing anything if it was already applied.

| Order | File | Creates | Needed by |
|---|---|---|---|
| 1 | `supabase/migrations/20261018000000_initial_schema.sql` | admin users, catalogue, settings, orders, enquiries, checkout functions, storage policies | everything (already applied on the live project) |
| 2 | `supabase/migrations/20261019000000_content_management.sql` | `hero_slides`, `instagram_reels`, `blog_posts`, product SEO columns | Hero Sections, Instagram Reels, Blogs, Offer Bar / Homepage visibility |
| 3 | `supabase/migrations/20261021000000_ingredients.sql` | `ingredients` | Ingredients |

`supabase/scripts/check_setup.sql` is read-only and reports which of these are applied. `supabase/scripts/grant_admin.sql` makes a verified Auth user an administrator. Optional: `supabase/scripts/import_qalbi_products_as_drafts.sql` adds QALBI's five products as **drafts at ₹0** (no prices are invented; publishing is refused until a real price and photo are set). **Never run `supabase/legacy/*` or `supabase/production/*` on this project** — they were written for an older project with different tables.

Local verification (never production): `supabase/tests/local_supabase_shim.sql` stands in for the Supabase platform on a plain PostgreSQL ≥ 15 database; then apply the migrations in order and run `supabase/tests/*_test.sql`.

Then set `COMMERCE_SOURCE=supabase` to sell the products managed in `/admin` (ignored while Shopify is configured), and sign in at `/admin/login`.

**UPI QR payment:** upload the real QR image in `/admin/media`, paste its path in Settings → Checkout, then switch QR payment on. The database refuses QR orders until both are set. Customers see the QR after placing the order; the order stays **pending** until you check your bank app and mark it paid in `/admin/orders`. Nothing marks an order paid automatically.

**Images:** `npm run assets:upload` copies `public/assets/**` into the bucket (needs `SUPABASE_SERVICE_ROLE_KEY` locally); then set `NEXT_PUBLIC_ASSET_SOURCE=supabase`. New images can also be uploaded in `/admin/media` (stored under `uploads/`).

**How it is secured:** signing in is not enough. Every admin page and server action checks the Supabase session with the Auth server *and* the user's row in `admin_users` (`src/lib/admin/auth.ts`); a non-admin is signed straight back out. The database enforces the same rule with RLS through `public.is_admin()`, which uses the verified `auth.uid()` — never an email or id sent by the browser. Visitors can read only published products, active categories and the storefront's setting keys. Orders are priced only inside `place_order()`; the browser never sends prices. The order confirmation page is unlocked by a random token kept in an httpOnly cookie. Orders and enquiries can be created only by the website server: `place_order_checked()` / `record_enquiry_checked()` are executable solely with the server-only `SUPABASE_SERVICE_ROLE_KEY` and enforce rate limits in the database (part of the initial schema). That key is used for nothing else — admin pages and actions run as the signed-in administrator under RLS.

**WhatsApp:** after an order, the confirmation page offers *Confirm Order on WhatsApp*, which opens WhatsApp with the order number, items, total and product image links pre-filled for the customer to send. Automatic business-sent WhatsApp messages would need the WhatsApp Business Platform (not configured).

**Ingredients (homepage carousel and /ingredients):** run `supabase/migrations/20261021000000_ingredients.sql` once in Supabase → SQL Editor (after the two earlier migrations). Then manage ingredients in `/admin/ingredients` — photos upload to `uploads/ingredients/` in the media bucket. Until one ingredient is published, the website shows the built-in confirmed list in `src/data/ingredients.ts` (Aloe Vera, Turmeric and Neem have no real photograph yet and show a line icon). Local test: `supabase/tests/ingredients_test.sql`.

**Tests:** `npm test` (checkout validation, WhatsApp message, content rules, product rules and storefront mapping, breadcrumb structured data). Database tests: `supabase/tests/*_test.sql` (see above).

## Google Search Console

1. Set `NEXT_PUBLIC_SITE_URL` to the live https domain (no trailing slash) and redeploy — canonical URLs, `sitemap.xml` and `robots.txt` use it.
2. Search Console → Add property → **Domain** → add the TXT record it shows at your DNS provider → Verify. (Or a URL-prefix property verified with the HTML-tag method via `metadata.verification.google` in `src/app/layout.tsx`.)
3. Sitemaps → submit `https://<domain>/sitemap.xml`.
4. URL Inspection → test the homepage and one product page → Request indexing.
5. Products and collections enter the sitemap only from the real catalogue (`COMMERCE_SOURCE=supabase` or Shopify). In preview mode product/collection pages are `noindex` and carry no Offer data, because preview prices are not confirmed.

## Structure

- `src/app/(site)` — storefront routes; `src/app/admin` — admin panel (`/admin`, `/admin/login`, orders, products, categories, ingredients, media, enquiries, settings); `src/app/checkout` lives in `(site)`
- `src/app` — routes (`/`, `/products`, `/products/[handle]`, `/collections/[handle]`, `/search`, `/cart`, `/about`, `/ingredients`, `/customised-skincare`, `/journal`, `/journal/[slug]`, `/contact`, `/reviews`, `/faqs`, `/policies/[slug]`, `/account`, API routes)
- `src/components` — `layout`, `home`, `products`, `cart`, `forms`, `ui`
- `src/lib/shopify` — typed Storefront client, queries, mappers, cached catalogue API
- `src/lib/cart/actions.ts` — cart server actions (Shopify cart or dev cart)
- `src/data` — brand config, navigation, content, fixtures, image map

import type { Metadata } from "next";
import Link from "next/link";
import { getAllSettings } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { saveSettingAction } from "@/lib/admin/actions";
import { settingSchemas, type SettingKey, type SettingValue } from "@/lib/store/settings";
import { trustBadges } from "@/data/trust-badges";
import { AdminHeading, Card, SetupNotice } from "@/components/admin/ui";
import { codBlockers, getCheckoutReadiness, type CheckoutReadiness } from "@/lib/admin/checkout-readiness";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { RowForm } from "@/components/admin/row-form";

export const metadata: Metadata = { title: "Settings" };

function read<K extends SettingKey>(all: Record<string, unknown>, key: K): SettingValue<K> {
  const parsed = settingSchemas[key].safeParse(all[key] ?? (key === "announcements" ? [] : {}));
  return (parsed.success ? parsed.data : settingSchemas[key].parse(key === "announcements" ? [] : {})) as SettingValue<K>;
}

function Section({ id, title, description, settingKey, children }: { id: string; title: string; description?: React.ReactNode; settingKey: SettingKey; children: React.ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-6 p-5">
      <h2 className="font-serif text-xl">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <RowForm action={saveSettingAction} className="mt-4 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="key" value={settingKey} />
        {children}
      </RowForm>
    </Card>
  );
}

const check = "flex items-center gap-2 text-sm";

export default async function AdminSettingsPage() {
  await requireAdmin();
  let all: Record<string, unknown>;
  let readiness: CheckoutReadiness;
  try {
    [all, readiness] = await Promise.all([getAllSettings(), getCheckoutReadiness()]);
  } catch (error) {
    return (
      <>
        <AdminHeading title="Settings" />
        <SetupNotice error={error} />
      </>
    );
  }
  const checkout = read(all, "checkout");
  const contact = read(all, "contact");
  const announcements = read(all, "announcements");
  const badges = read(all, "trust_badges");
  const featured = read(all, "featured");
  const claims = read(all, "brand_claims");

  return (
    <>
      <AdminHeading title="Settings" description="Changes appear on the website within a minute." />
      <div className="space-y-6">
        <Readiness readiness={readiness} codOn={checkout.codEnabled} qrOn={checkout.phoneEnabled} />
        <Section id="checkout" title="Checkout & delivery" settingKey="checkout" description="Payment options offered at checkout. Orders are always priced on the server.">
          <label className={check}>
            <input type="checkbox" name="codEnabled" defaultChecked={checkout.codEnabled} className="accent-[var(--color-forest)]" /> Cash on Delivery
          </label>
          <label className={check}>
            <input type="checkbox" name="phoneEnabled" defaultChecked={checkout.phoneEnabled} className="accent-[var(--color-forest)]" /> UPI QR payment
          </label>
          <div className="sm:col-span-2">
            <label htmlFor="s-qr" className="label">Payment QR image path</label>
            <input id="s-qr" name="qrImagePath" defaultValue={checkout.qrImagePath ?? ""} placeholder="uploads/payments/upi-qr-….png" className="field" />
            <p className="mt-1 text-xs text-muted">
              Upload your real UPI QR code in <Link href="/admin/media" className="text-forest underline">Media</Link> and paste its path here. QR payment can only be switched on once this is
              set. Customers see the QR after placing an order; payment stays <strong className="font-medium">pending</strong> until you check your bank app and mark the order paid.
            </p>
          </div>
          <div>
            <label htmlFor="s-delivery" className="label">Delivery charge (₹)</label>
            <input id="s-delivery" name="deliveryCharge" type="number" min="0" step="1" defaultValue={checkout.deliveryCharge} className="field" />
          </div>
          <div>
            <label htmlFor="s-free" className="label">Free delivery on orders over (₹, blank = never)</label>
            <input id="s-free" name="freeDeliveryOver" type="number" min="0" step="1" defaultValue={checkout.freeDeliveryOver ?? ""} className="field" />
          </div>
        </Section>

        <Section id="contact" title="Business contact" settingKey="contact" description="Used on order confirmations and for pay-by-phone orders.">
          <div>
            <label htmlFor="s-wa" className="label">WhatsApp number (digits with country code)</label>
            <input id="s-wa" name="whatsappDigits" defaultValue={contact.whatsappDigits} className="field" />
          </div>
          <div>
            <label htmlFor="s-wa-display" className="label">WhatsApp number as displayed</label>
            <input id="s-wa-display" name="whatsappDisplay" defaultValue={contact.whatsappDisplay} className="field" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="s-email" className="label">Email</label>
            <input id="s-email" name="email" type="email" defaultValue={contact.email} className="field" />
          </div>
        </Section>

        <Section id="announcements" title="Announcement bar" settingKey="announcements" description={<>One message per line, optionally followed by a link: <code>Explore Our Skincare Collection | /products</code>. Leave empty to use the default messages.</>}>
          <textarea name="lines" rows={4} defaultValue={announcements.map((a) => (a.href ? `${a.text} | ${a.href}` : a.text)).join("\n")} className="field resize-y sm:col-span-2" aria-label="Announcement messages" />
        </Section>

        <Section id="featured" title="Featured products" settingKey="featured" description="Category handle used for “The QALBI Favourites” on the homepage.">
          <div>
            <label htmlFor="s-featured" className="label">Category handle</label>
            <input id="s-featured" name="collectionHandle" defaultValue={featured.collectionHandle} className="field" />
          </div>
        </Section>

        <Section id="trust-badges" title="Verified trust badges" settingKey="trust_badges" description="Tick a claim badge only when you hold supporting documentation for it.">
          {trustBadges
            .filter((b) => b.isClaim)
            .map((b) => (
              <label key={b.id} className={check}>
                <input type="checkbox" name="verified" value={b.id} defaultChecked={badges[b.id] ?? b.verified} className="accent-[var(--color-forest)]" /> {b.title}
              </label>
            ))}
        </Section>

        <Section id="brand-claims" title="About page brand claims" settingKey="brand_claims" description="Natural, vegan, halal, cruelty-free and “free from parabens, lead, silicones and formaldehyde releasers”.">
          <label className={`${check} sm:col-span-2`}>
            <input type="checkbox" name="verified" defaultChecked={claims.verified} className="accent-[var(--color-forest)]" /> Supporting documentation is on file for these claims
          </label>
          <div className="sm:col-span-2">
            <label htmlFor="s-claims-note" className="label">Where the evidence is kept</label>
            <input id="s-claims-note" name="note" defaultValue={claims.note} className="field" placeholder="e.g. Supplier certificates folder, updated Oct 2026" />
          </div>
        </Section>
      </div>
    </>
  );
}

function Readiness({ readiness, codOn, qrOn }: { readiness: CheckoutReadiness; codOn: boolean; qrOn: boolean }) {
  const ready = codBlockers(readiness).length === 0;
  const items = [
    { ok: readiness.supabaseCatalogue, label: "Website uses the Supabase product catalogue", fix: "Set COMMERCE_SOURCE=supabase in Vercel and redeploy." },
    { ok: readiness.serverKey, label: "Server key for placing orders is configured", fix: "Add SUPABASE_SERVICE_ROLE_KEY (server-only) in Vercel and redeploy." },
    {
      ok: (readiness.pricedProducts ?? 0) > 0,
      label: readiness.pricedProducts === null ? "Published products could not be counted" : `${readiness.pricedProducts} published product${readiness.pricedProducts === 1 ? "" : "s"} with a price`,
      fix: "Publish at least one real product with its real price.",
    },
  ];
  return (
    <Card id="checkout-readiness" className="p-5">
      <h2 className="font-serif text-xl">Checkout readiness</h2>
      <p className="mt-1 text-sm text-muted">
        Cash on Delivery is <strong className="font-medium text-ink">{codOn ? "on" : "off"}</strong> and UPI QR payment is <strong className="font-medium text-ink">{qrOn ? "on" : "off"}</strong>.{" "}
        {ready ? "Everything required to take orders is in place." : "Payments can only be switched on once every item below is ticked."}
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2">
            {item.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-botanical" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#7a5418]" aria-hidden />}
            <span>
              <span className="sr-only">{item.ok ? "Done: " : "To do: "}</span>
              {item.label}
              {!item.ok && <span className="block text-xs text-muted">{item.fix}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted">
        Right after switching Cash on Delivery on, place one small test order yourself, confirm it appears in Orders with the correct prices, then cancel it (cancelling returns the stock) — and switch
        Cash on Delivery off again if anything looks wrong. UPI QR payment also needs your real QR image uploaded to Media; the server checks the file before the option can be switched on. Payments are never
        marked as received automatically.
      </p>
    </Card>
  );
}

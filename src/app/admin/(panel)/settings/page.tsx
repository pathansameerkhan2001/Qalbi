import type { Metadata } from "next";
import Link from "next/link";
import { getAllSettings } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { saveSettingAction } from "@/lib/admin/actions";
import { settingSchemas, type SettingKey, type SettingValue } from "@/lib/store/settings";
import { trustBadges } from "@/data/trust-badges";
import { AdminHeading, Card, SetupNotice } from "@/components/admin/ui";
import { RowForm } from "@/components/admin/row-form";

export const metadata: Metadata = { title: "Settings" };

function read<K extends SettingKey>(all: Record<string, unknown>, key: K): SettingValue<K> {
  const parsed = settingSchemas[key].safeParse(all[key] ?? (key === "announcements" || key === "instagram_reels" ? [] : {}));
  return (parsed.success ? parsed.data : settingSchemas[key].parse(key === "announcements" || key === "instagram_reels" ? [] : {})) as SettingValue<K>;
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
  try {
    all = await getAllSettings();
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
  const hero = read(all, "hero");
  const reels = read(all, "instagram_reels");
  const badges = read(all, "trust_badges");
  const featured = read(all, "featured");
  const claims = read(all, "brand_claims");

  return (
    <>
      <AdminHeading title="Settings" description="Changes appear on the website within a minute." />
      <div className="space-y-6">
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

        <Section id="hero" title="Homepage hero" settingKey="hero" description={<>Optional replacement for the first hero slide. Use paths from the <Link href="/admin/media" className="text-forest underline">media library</Link>; leave empty to keep the current photography.</>}>
          <div>
            <label htmlFor="s-hero-d" className="label">Desktop image path (wide, about 16:9)</label>
            <input id="s-hero-d" name="desktopPath" defaultValue={hero.desktopPath ?? ""} className="field" />
          </div>
          <div>
            <label htmlFor="s-hero-m" className="label">Mobile image path (portrait 4:5)</label>
            <input id="s-hero-m" name="mobilePath" defaultValue={hero.mobilePath ?? ""} className="field" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="s-hero-alt" className="label">Image description (alt text)</label>
            <input id="s-hero-alt" name="alt" defaultValue={hero.alt} className="field" />
          </div>
        </Section>

        <Section id="featured" title="Featured products" settingKey="featured" description="Category handle used for “The QALBI Favourites” on the homepage.">
          <div>
            <label htmlFor="s-featured" className="label">Category handle</label>
            <input id="s-featured" name="collectionHandle" defaultValue={featured.collectionHandle} className="field" />
          </div>
        </Section>

        <Section id="reels" title="Instagram Reels" settingKey="instagram_reels" description={<>One Reel per line: <code>Title | https://www.instagram.com/reel/… | uploads/reels/thumb.webp</code>. Only add real Reel links from @qalbinaturals.</>}>
          <textarea name="lines" rows={5} defaultValue={reels.map((r) => `${r.title} | ${r.reelUrl} | ${r.thumbnailPath}`).join("\n")} className="field resize-y sm:col-span-2" aria-label="Instagram Reels" />
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

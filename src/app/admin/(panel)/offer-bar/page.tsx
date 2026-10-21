import type { Metadata } from "next";
import Link from "next/link";
import { getAllSettings } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { offerBarSchema } from "@/lib/store/settings";
import { AdminHeading, SetupNotice } from "@/components/admin/ui";
import { OfferBarForm } from "./offer-bar-form";

export const metadata: Metadata = { title: "Offer announcement bar" };

export default async function AdminOfferBarPage() {
  await requireAdmin();
  let all: Record<string, unknown>;
  try {
    all = await getAllSettings();
  } catch (error) {
    return (
      <>
        <AdminHeading title="Offer announcement bar" />
        <SetupNotice error={error} migration="content" />
      </>
    );
  }
  const parsed = offerBarSchema.safeParse(all.offer_bar ?? {});
  const initial = parsed.success ? parsed.data : offerBarSchema.parse({});
  return (
    <>
      <AdminHeading title="Offer announcement bar" description="A slim bar shown directly after the homepage hero." />
      <p className="mb-6 text-sm text-muted">
        The thin bar at the very top of every page is separate — edit it under{" "}
        <Link href="/admin/settings#announcements" className="text-forest underline">
          Store Settings → Announcement bar
        </Link>
        .
      </p>
      {!parsed.success && <p className="mb-4 text-sm text-danger">The saved offer bar could not be read and has been reset in this form. Saving replaces it.</p>}
      {parsed.success && initial.enabled && initial.messages.length === 0 && (
        <p role="status" className="mb-4 rounded-[3px] border border-gold/40 bg-gold-pale/40 p-3 text-sm">
          The bar is switched on but has no messages, so <strong className="font-medium">nothing is shown on the website</strong>. Add a message, or untick “Show the offer bar”, then save.
        </p>
      )}
      <OfferBarForm initial={initial} />
    </>
  );
}

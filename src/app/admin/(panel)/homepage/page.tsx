import type { Metadata } from "next";
import Link from "next/link";
import { getAllSettings } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { saveSettingAction } from "@/lib/admin/actions";
import { homepageSectionsSchema } from "@/lib/store/settings";
import { homepageSections, resolveHomepageSections } from "@/lib/content/homepage";
import { AdminHeading, Card, SetupNotice } from "@/components/admin/ui";
import { RowForm } from "@/components/admin/row-form";

export const metadata: Metadata = { title: "Homepage sections" };

const labels = Object.fromEntries(homepageSections.map((s) => [s.id, s.label]));

/** Where each section's content is edited, when it is editable in the admin panel. */
const editLinks: Record<string, { href: string; label: string }> = {
  categories: { href: "/admin/categories", label: "Categories" },
  favourites: { href: "/admin/products", label: "Products" },
  reels: { href: "/admin/reels", label: "Instagram Reels" },
  journal: { href: "/admin/blog", label: "Blog" },
  trust_badges: { href: "/admin/settings#trust-badges", label: "Store Settings" },
};

export default async function AdminHomepagePage() {
  await requireAdmin();
  let all: Record<string, unknown>;
  try {
    all = await getAllSettings();
  } catch (error) {
    return (
      <>
        <AdminHeading title="Homepage sections" />
        <SetupNotice error={error} />
      </>
    );
  }
  const parsed = homepageSectionsSchema.safeParse(all.homepage_sections ?? {});
  const layout = resolveHomepageSections(parsed.success ? parsed.data.sections : []);

  return (
    <>
      <AdminHeading title="Homepage sections" description="Choose which sections appear on the homepage and in what order." />
      <Card className="p-5">
        <p className="mb-4 text-sm text-muted">
          The <Link href="/admin/hero" className="text-forest underline">hero</Link> is always first, followed by the{" "}
          <Link href="/admin/offer-bar" className="text-forest underline">offer bar</Link> when it is switched on. Lower numbers appear higher on the page.
        </p>
        <RowForm action={saveSettingAction} submitLabel="Save homepage layout" className="space-y-4">
          <input type="hidden" name="key" value="homepage_sections" />
          <ol className="divide-y divide-line rounded-[3px] border border-line">
            {layout.map((s, i) => (
              <li key={s.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <label className="flex items-center gap-2 text-sm">
                  <span className="sr-only">Position of {labels[s.id]}</span>
                  <input name={`order_${s.id}`} type="number" min={1} max={99} defaultValue={i + 1} className="field w-20" />
                </label>
                <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  <input type="checkbox" name={`visible_${s.id}`} defaultChecked={s.visible} className="accent-[var(--color-forest)]" />
                  <span className="truncate">{labels[s.id]}</span>
                </label>
                {editLinks[s.id] && (
                  <Link href={editLinks[s.id].href} className="text-xs text-forest underline">
                    Edit in {editLinks[s.id].label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted">Unticked sections are hidden. Some sections show a short placeholder until they have content (for example the journal before the first post).</p>
        </RowForm>
      </Card>
    </>
  );
}

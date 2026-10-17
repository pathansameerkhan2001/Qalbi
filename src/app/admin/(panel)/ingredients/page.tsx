import type { Metadata } from "next";
import Image from "next/image";
import { requireAdmin } from "@/lib/admin/auth";
import { getIngredients } from "@/lib/store/content";
import { AdminHeading, Card } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Ingredients" };

/** The production database has no ingredients table; the website uses the confirmed list in src/data/ingredients.ts. */
export default async function AdminIngredientsPage() {
  await requireAdmin();
  const ingredients = await getIngredients();
  return (
    <>
      <AdminHeading title="Ingredients" description="Only ingredients confirmed in QALBI's formulations are listed." />
      <Card className="mb-4 p-4 text-sm text-muted">
        This list is part of the website code (<code className="rounded bg-sand px-1">src/data/ingredients.ts</code>) and is read-only here. Ask your developer to change it.
      </Card>
      <ul className="grid gap-4 sm:grid-cols-2">
        {ingredients.map((i) => (
          <li key={i.slug}>
            <Card className="flex gap-4 p-4">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-[3px] border border-line bg-sand">
                <Image src={i.image.src} alt="" fill sizes="64px" className="object-cover" />
              </span>
              <span className="text-sm">
                <span className="block font-medium text-ink">{i.name}</span>
                <span className="mt-1 block text-muted">{i.description}</span>
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

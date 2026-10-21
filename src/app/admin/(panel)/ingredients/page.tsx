import type { Metadata } from "next";
import Image from "next/image";
import { requireAdmin } from "@/lib/admin/auth";
import { listIngredients } from "@/lib/admin/data";
import { deleteIngredientAction } from "@/lib/admin/content-actions";
import { mediaUrl } from "@/lib/assets";
import { getProducts } from "@/lib/shopify";
import type { IngredientRow } from "@/lib/store/cms";
import { ingredients as defaultIngredients } from "@/data/ingredients";
import { AdminHeading, Card, SetupNotice } from "@/components/admin/ui";
import { RowForm } from "@/components/admin/row-form";
import { BotanicalIcon } from "@/components/ui/botanical-icons";
import { IngredientForm, NewIngredient } from "./ingredient-form";

export const metadata: Metadata = { title: "Ingredients" };

export default async function AdminIngredientsPage() {
  await requireAdmin();
  // Both reads start together (the product list is only for the "Found in" picker).
  const productList = getProducts("featured", 48).catch(() => []);
  let rows: IngredientRow[];
  try {
    rows = await listIngredients();
  } catch (error) {
    return (
      <>
        <AdminHeading title="Ingredients" />
        <SetupNotice error={error} migration="ingredients" />
        <BuiltInList />
      </>
    );
  }
  const products = (await productList).map((p) => ({ handle: p.handle, title: p.title }));
  const live = rows.filter((r) => r.active).length;

  return (
    <>
      <AdminHeading title="Ingredients" description="The ingredient carousel on the homepage and the cards on /ingredients." />
      <Card className="mb-6 p-4 text-sm text-muted">
        {live > 0 ? (
          <>
            {live} ingredient{live === 1 ? " is" : "s are"} live. The website shows only the ingredients below that have “Show on the website” ticked, in the order given.
          </>
        ) : (
          <>No ingredient is live yet, so the website shows the built-in confirmed list ({defaultIngredients.map((i) => i.name).join(", ")}). As soon as one ingredient below is published, the website shows only the published ones.</>
        )}{" "}
        Add only ingredients QALBI has confirmed, with real photographs — an ingredient without a photo shows its line icon.
      </Card>
      <div className="space-y-4">
        {rows.map((r) => (
          <Card key={r.id} className="p-5">
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 [&::-webkit-details-marker]:hidden">
                <Thumb path={r.imagePath} icon={r.icon} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{r.name}</span>
                  <span className="block truncate text-xs text-muted">{r.description}</span>
                </span>
                <span className="text-xs text-muted">Order {r.sort}</span>
                <span className={r.active ? "rounded-full bg-botanical/15 px-2 py-0.5 text-[0.7rem] font-medium text-forest" : "rounded-full bg-line px-2 py-0.5 text-[0.7rem] font-medium text-muted"}>
                  {r.active ? "Live" : "Hidden"}
                </span>
                <span className="text-xs text-forest underline">Edit</span>
              </summary>
              <div className="mt-5 border-t border-line pt-5">
                <IngredientForm
                  products={products}
                  initial={{ id: r.id, name: r.name, slug: r.slug, description: r.description, imagePath: r.imagePath ?? "", imageAlt: r.imageAlt ?? "", icon: r.icon, productHandles: r.productHandles, sort: r.sort, active: r.active }}
                />
                <RowForm action={deleteIngredientAction} submitLabel="Delete ingredient" variant="danger" confirm={`Delete “${r.name}”? Its photo stays in the Media library.`} className="mt-4 flex justify-end">
                  <input type="hidden" name="id" value={r.id} />
                </RowForm>
              </div>
            </details>
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-6 text-sm text-muted">No ingredients in the database yet. Add the first one below — for example, start by re-creating the built-in list with your own photos.</Card>}
        <Card className="border-dashed p-5">
          <h2 className="mb-4 font-serif text-xl">Add an ingredient</h2>
          <NewIngredient nextSort={(rows.at(-1)?.sort ?? 0) + 1} products={products} />
        </Card>
      </div>
    </>
  );
}

function Thumb({ path, icon }: { path: string | null; icon: IngredientRow["icon"] }) {
  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold-soft/60 bg-gold-pale text-botanical">
      {path ? <Image src={mediaUrl(path)} alt="" fill sizes="56px" className="object-cover" /> : <BotanicalIcon name={icon} className="size-8" />}
    </span>
  );
}

/** Shown before the ingredients migration has been applied. */
function BuiltInList() {
  return (
    <Card className="mt-6 p-5">
      <h2 className="font-serif text-xl">Currently on the website (built-in list)</h2>
      <p className="mt-1 text-sm text-muted">
        Apply <code className="rounded bg-sand px-1">supabase/migrations/20261021000000_ingredients.sql</code> to manage ingredients here.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {defaultIngredients.map((i) => (
          <li key={i.slug} className="flex items-center gap-3 text-sm">
            <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold-soft/60 bg-gold-pale text-botanical">
              {i.image ? <Image src={i.image.src} alt="" fill sizes="48px" className="object-cover" /> : <BotanicalIcon name={i.icon} className="size-7" />}
            </span>
            <span>
              <span className="block font-medium text-ink">{i.name}</span>
              <span className="block text-muted">{i.description}</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

import type { Metadata } from "next";
import { listHeroSlides } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteHeroSlideAction } from "@/lib/admin/content-actions";
import { mediaUrl } from "@/lib/assets";
import type { HeroSlideRow } from "@/lib/store/cms";
import { AdminHeading, Card, SetupNotice } from "@/components/admin/ui";
import { RowForm } from "@/components/admin/row-form";
import { HeroSlideForm, NewHeroSlide, type HeroSlideValues } from "./hero-slide-form";

export const metadata: Metadata = { title: "Hero sections" };

const toValues = (s: HeroSlideRow): HeroSlideValues => ({
  id: s.id,
  heading: s.heading ?? "",
  subtitle: s.subtitle ?? "",
  buttonLabel: s.buttonLabel ?? "",
  buttonHref: s.buttonHref ?? "",
  desktopImagePath: s.desktopImagePath,
  mobileImagePath: s.mobileImagePath,
  alt: s.alt,
  sort: s.sort,
  active: s.active,
});

export default async function AdminHeroPage() {
  await requireAdmin();
  let slides: HeroSlideRow[];
  try {
    slides = await listHeroSlides();
  } catch (error) {
    return (
      <>
        <AdminHeading title="Hero sections" />
        <SetupNotice error={error} migration="content" />
      </>
    );
  }
  const active = slides.filter((s) => s.active).length;

  return (
    <>
      <AdminHeading
        title="Hero sections"
        description={
          active
            ? `${active} slide${active === 1 ? "" : "s"} shown on the homepage, in the order below.`
            : "No slides are shown yet — the homepage uses the built-in photography until at least one slide is published."
        }
      />
      <div className="space-y-4">
        {slides.length === 0 && <Card className="p-6 text-sm text-muted">No hero slides yet. Add the first one below.</Card>}
        {slides.map((s) => (
          <Card key={s.id} className="p-5">
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-4 [&::-webkit-details-marker]:hidden">
                <span className="flex gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                  <img src={mediaUrl(s.desktopImagePath)} alt="" className="h-12 w-[5.6rem] rounded-[2px] bg-sand object-cover" />
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                  <img src={mediaUrl(s.mobileImagePath)} alt="" className="h-12 w-[2.4rem] rounded-[2px] bg-sand object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{s.heading || s.alt}</span>
                  <span className="text-xs text-muted">Order {s.sort}</span>
                </span>
                <span className={s.active ? "rounded-full bg-botanical/15 px-2 py-0.5 text-[0.7rem] font-medium text-forest" : "rounded-full bg-line px-2 py-0.5 text-[0.7rem] font-medium text-muted"}>
                  {s.active ? "Live" : "Hidden"}
                </span>
                <span className="text-xs text-forest underline">Edit</span>
              </summary>
              <div className="mt-5 border-t border-line pt-5">
                <HeroSlideForm initial={toValues(s)} />
                <RowForm action={deleteHeroSlideAction} submitLabel="Delete slide" variant="danger" confirm="Delete this slide? Its images stay in the Media library." className="mt-4 flex justify-end">
                  <input type="hidden" name="id" value={s.id} />
                </RowForm>
              </div>
            </details>
          </Card>
        ))}
        <Card className="border-dashed p-5">
          <h2 className="mb-4 font-serif text-xl">Add a slide</h2>
          <NewHeroSlide nextSort={(slides.at(-1)?.sort ?? 0) + 1} />
        </Card>
      </div>
    </>
  );
}

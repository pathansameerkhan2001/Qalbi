/**
 * Homepage sections an administrator can reorder or hide (/admin/homepage).
 * The hero and the offer bar are fixed at the top and managed on their own pages.
 */
export const homepageSections = [
  { id: "categories", label: "Shop by category" },
  { id: "trust_badges", label: "Trust badges" },
  { id: "favourites", label: "The QALBI Favourites (products)" },
  { id: "reels", label: "Instagram Reels" },
  { id: "lookbook", label: "Lookbook" },
  { id: "about", label: "About story" },
  { id: "values", label: "Values strip" },
  { id: "ingredients", label: "Ingredients preview" },
  { id: "custom_skincare", label: "Customised skincare" },
  { id: "journal", label: "Journal (latest blog posts)" },
  { id: "testimonials", label: "Testimonials" },
] as const;

export type HomepageSectionId = (typeof homepageSections)[number]["id"];

export const homepageSectionIds = homepageSections.map((s) => s.id) as [HomepageSectionId, ...HomepageSectionId[]];

/**
 * Saved order and visibility merged with the built-in list: unknown ids are
 * dropped, duplicates ignored, and sections added to the website later appear
 * (visible) at the end until the administrator places them.
 */
export function resolveHomepageSections(saved: { id: string; visible: boolean }[] | null | undefined): { id: HomepageSectionId; visible: boolean }[] {
  const known = new Set<string>(homepageSectionIds);
  const seen = new Set<string>();
  const result: { id: HomepageSectionId; visible: boolean }[] = [];
  for (const s of saved ?? []) {
    if (!known.has(s.id) || seen.has(s.id)) continue;
    seen.add(s.id);
    result.push({ id: s.id as HomepageSectionId, visible: s.visible });
  }
  for (const id of homepageSectionIds) if (!seen.has(id)) result.push({ id, visible: true });
  return result;
}

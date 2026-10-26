/**
 * Manual ordering for admin lists (categories, hero slides, products). Pure,
 * so it is unit-tested in tests/products.test.mts.
 *
 * Moves one row up or down in the full list (as read in display order), then
 * renumbers everything 10, 20, 30… so equal or missing numbers are resolved.
 * Returns only the rows whose number changes (nothing to write when the row is
 * already first/last), or null when the id is not in the list.
 */
export function moveInOrder(list: { id: string; sort: number | null }[], id: string, direction: "up" | "down"): { id: string; sort: number }[] | null {
  const from = list.findIndex((row) => row.id === id);
  if (from < 0) return null;
  const to = from + (direction === "up" ? -1 : 1);
  if (to < 0 || to >= list.length) return [];
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next.map((row, i) => ({ id: row.id, sort: (i + 1) * 10, before: row.sort })).filter((row) => row.sort !== row.before).map(({ id, sort }) => ({ id, sort }));
}

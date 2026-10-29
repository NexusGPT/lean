// Branded primitives as Set items, Map keys and === operands (common.mjs primitiveBrand)
declare const groupBrand: unique symbol;
export type GroupID = number & { readonly [groupBrand]: true };
export type Slug = string & { readonly __kind: 'Slug' };

export function collapsedOf(ids: readonly GroupID[], open: GroupID): boolean {
  const shut = new Set<GroupID>(ids);
  if (shut.has(open)) return true;
  return false;
}

export function sameSlug(a: Slug, b: Slug): boolean {
  return a !== b;
}

export function distinct(ids: readonly GroupID[]): number {
  return ids.length;
}

export function hits(slugs: readonly Slug[], counts: ReadonlyMap<Slug, number>): number {
  let total = 0;
  for (const s of slugs) total += counts.get(s) ?? 0;
  return total;
}

export function seenTwice(seen: ReadonlySet<Slug>, s: Slug): string {
  return seen.size > 0 ? 'again' : 'first';
}

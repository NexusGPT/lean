// step 0 of the stage 5 heap core: two measurement defects the census met. A recursive type (a tree of nodes) has
// no shape, and the reason it has none is named without walking the type forever; a callback's own return is not
// the unit's result, so it does not expose the unit.
export interface TreeNode { name: string; children: TreeNode[] }
export interface Tag { label: string }
export interface Item { ok: boolean; tag: Tag }

export function rootName(n: TreeNode): string {
  return n.name + "";
}

export function stamp(items: Item[]): number {
  const tags = items.map((item) => { const found = item.tag; return found; });
  return tags.length;
}

export function width(xs: number[]): number {
  return xs.length + 1;
}

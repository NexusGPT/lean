// stage 5 step 3: a conditional expression evaluates its condition, then the selected operand only
export interface Item { name: string; qty: number; note?: string; tags: string[] }

export function size(i: Item): string {
  return i.qty > 10 ? "big" : "small";
}

export function caption(i: Item): string {
  return i.note !== undefined ? i.note : i.name;
}

export function pick(i: Item): string[] {
  return i.qty > 0 ? [i.name] : [];
}

export function count(i: Item): number {
  return i.tags.length > 0 ? i.tags.length : 0;
}

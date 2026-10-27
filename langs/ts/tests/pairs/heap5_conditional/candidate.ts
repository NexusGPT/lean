// stage 5 step 3: a conditional expression evaluates its condition, then the selected operand only
export interface Item { name: string; qty: number; note?: string; tags: string[] }

export function size(i: Item): string {
  return i.qty >= 10 ? "big" : "small";
}

export function caption(i: Item): string {
  return i.note ?? i.name;
}

export function pick(i: Item): string[] {
  if (i.qty > 0) {
    return [i.name];
  }
  return [];
}

export function count(i: Item): number {
  return i.tags.length > 0 ? i.tags.length : 0;
}

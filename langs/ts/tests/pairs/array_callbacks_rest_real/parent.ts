// indexOf, findIndex and at in a real file (100.5 makes it one): a position is an integer the file reads as a real, and
// at's number is truncated to one; an indexed callback's index is that position as a real. Each unit then writes the
// lines it walks in a forEach statement (only the heap core reads that write): the same loop on both sides.
export interface Line { qty: number; big: boolean; tag: string }
export interface Order { lines: Line[]; prices: number[]; tags: string[] }

export function whereRush(o: Order): void {
  const at = o.tags.indexOf("rush");
  o.lines.forEach((l) => { l.qty = at; });
}

export function whereTag(o: Order): void {
  const at = o.tags.indexOf("rush");
  o.lines.forEach((l) => { l.qty = at; });
}

export function firstBig(o: Order): void {
  const at = o.prices.findIndex((p) => p > 100.5);
  o.lines.forEach((l) => { l.qty = at; });
}

export function lastTag(o: Order): void {
  const tag = o.tags.at(-1) ?? "";
  o.lines.forEach((l) => { l.tag = tag; });
}

export function flagSome(o: Order): void {
  const hit = o.prices.some((p, i) => i < 2 && p > 100);
  o.lines.forEach((l) => { l.big = hit; });
}

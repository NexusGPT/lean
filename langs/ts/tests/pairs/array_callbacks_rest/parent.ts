// the array callbacks the core read with one parameter and an expression body, read now with an index, with a block
// body of bindings, and as a forEach over the index; indexOf, findIndex and at in a real file (100.5 makes it one).
// Each unit writes the lines it walks in a forEach statement, which only the heap core reads.
export interface Line { qty: number; big: boolean; tag: string }
export interface Order { lines: Line[]; prices: number[]; tags: string[] }

export function flagSome(o: Order): void {
  o.lines.forEach((l) => { l.big = o.prices.some((p, i) => i < l.qty && p > 100); });
}

export function flagEvery(o: Order): void {
  o.lines.forEach((l) => { l.big = o.prices.every((p, i) => i >= l.qty || p > 0); });
}

export function pickTag(o: Order): void {
  o.lines.forEach((l) => { l.tag = o.tags.find((t, i) => i > 0 && t !== l.tag) ?? ""; });
}

export function firstBig(o: Order): void {
  o.lines.forEach((l) => { l.qty = o.prices.findIndex((p, i) => p > 100.5 && i > 0); });
}

export function whereRush(o: Order): void {
  o.lines.forEach((l) => { l.qty = o.tags.indexOf("rush"); });
}

export function lastTag(o: Order): void {
  o.lines.forEach((l) => { l.tag = o.tags.at(-1) ?? ""; });
}

export function weigh(o: Order): void {
  const ws = o.prices.map((p, i) => p * i);
  o.lines.forEach((l) => { l.qty = ws.length; });
}

export function keepFirst(o: Order): void {
  const ks = o.prices.filter((p, i) => i < 3 && p > 0);
  o.lines.forEach((l) => { l.qty = ks.length; });
}

export function doubled(o: Order): void {
  o.lines.forEach((l) => { l.big = o.prices.some((p) => { const q = p * 2; return q > l.qty; }); });
}

export function numberLines(o: Order): void {
  o.lines.forEach((l, i) => { l.qty = i * 2; });
}

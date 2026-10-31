// the array callbacks the core read with one parameter and an expression body, read now with an index and with a
// block body of bindings. Each unit then writes the lines it walks in a forEach statement (only the heap core reads that
// write) whose callback reads the value the unit computed: the same loop on both sides.
export interface Line { qty: number; big: boolean; tag: string }
export interface Order { lines: Line[]; prices: number[]; tags: string[] }

export function flagSome(o: Order): void {
  const hit = o.prices.some((p, i) => p > 100 && i < 2);
  o.lines.forEach((l) => { l.big = hit; });
}

export function flagEvery(o: Order): void {
  const ok = o.prices.every((p, i) => i === 0 || p >= 0);
  o.lines.forEach((l) => { l.big = ok; });
}

export function pickTag(o: Order): void {
  const tags = o.tags;
  const tag = tags.find((t, i) => i > 0 && t !== "") ?? "";
  o.lines.forEach((l) => { l.tag = tag; });
}

export function firstBig(o: Order): void {
  const prices = o.prices;
  const at = prices.findIndex((p, i) => p > 100 && i > 0);
  o.lines.forEach((l) => { l.qty = at; });
}

export function weigh(o: Order): void {
  const prices = o.prices;
  const ws = prices.map((p, i) => p * i);
  o.lines.forEach((l) => { l.qty = ws.length; });
}

export function keepFirst(o: Order): void {
  const prices = o.prices;
  const ks = prices.filter((p, i) => i < 3 && p > 0);
  o.lines.forEach((l) => { l.qty = ks.length; });
}

export function doubled(o: Order): void {
  const big = o.prices.some((p) => p * 2 > 100);
  o.lines.forEach((l) => { l.big = big; });
}

export function numberLines(o: Order): void {
  const lines = o.lines;
  lines.forEach((l, i) => { l.qty = i; });
}

export function total(o: Order): void {
  const sum = o.prices.reduce((a, p) => a + p, 0);
  o.lines.forEach((l) => { l.qty = sum; });
}

export function totalGuarded(o: Order): void {
  const prices = o.prices;
  if (prices.length === 0) return;
  const sum = prices.reduce((a, p) => a + p);
  o.lines.forEach((l) => { l.qty = sum; });
}

export function weighLet(o: Order): void {
  const prices = o.prices;
  const ws = prices.map((p) => { let w = p * 2; return w + 1; });
  o.lines.forEach((l) => { l.qty = ws.length; });
}

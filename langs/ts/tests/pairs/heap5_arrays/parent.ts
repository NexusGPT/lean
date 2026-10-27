// stage 5 step 11: the array callbacks some, every, find, findIndex and reduce read the items as a pure function of
// them; includes, indexOf and at search or index them; forEach as a statement is a loop over them
export interface Order { qty: number; tags: string[]; prices: number[] }

export function hasRush(o: Order): boolean {
  return o.tags.some((t) => t === "rush");
}

export function allPositive(o: Order): boolean {
  return o.prices.every((p) => p > 0);
}

export function total(o: Order): number {
  return o.prices.reduce((acc, p) => acc + p, 0);
}

export function firstBig(o: Order): number {
  return o.prices.findIndex((p) => p > 100);
}

export function bump(o: Order): void {
  o.prices.forEach((p) => {
    o.qty += p;
  });
}

export function firstTag(o: Order): string {
  return o.tags.at(0) ?? "";
}

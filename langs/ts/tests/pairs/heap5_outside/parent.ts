import { save, price, next, Item } from "./store";
export function cost(i: Item): number { return price(i.id) + i.qty; }
export function persist(i: Item): number { i.qty += 1; save(i); return i.qty; }
export function twice(): number { const a = next(); const b = next(); return a - b; }
export function order(i: Item): number { const p = price(i.id); save(i); return p; }

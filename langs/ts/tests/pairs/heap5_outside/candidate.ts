import { save, price, next, Item } from "./store";
export function cost(i: Item): number { const p = price(i.id); return p + i.qty; }
export function persist(i: Item): number { save(i); i.qty += 1; return i.qty; }
export function twice(): number { const a = next(); return a - a; }
export function order(i: Item): number { save(i); return price(i.id); }

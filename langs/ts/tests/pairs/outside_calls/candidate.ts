import { price, total, find, save, bump, Item } from "./store";
const half = (n: number): number => n / 2;
export function usedOnce(i: Item): number { const p = price(i.id); return p * 2; }
export function writtenBack(i: Item): number { const p = price(i.id); i.qty = p; return i.qty; }
export function calledTwice(i: Item): number { return price(i.id) + price(i.id); }
export function passedOn(i: Item): number { return total(price(i.id), i.qty); }
export function passedLocal(i: Item): number { return half(price(i.id)); }
export function passedSwapped(i: Item): number { return total(i.qty, price(i.id)); }
export function passedRef(id: number): number { const it = find(id); const q = it.qty; save(it); return q; }
export function usedTwice(id: number): number { const it = find(id); const q = it.qty; const d = it.id; return total(q, d); }
export function readFirst(i: Item): number { const b = bump(i); return total(i.qty, b); }
export function readFirstNamed(i: Item): number { const q = i.qty; return total(q, bump(i)); }
export function guarded(i: Item, c: boolean): boolean { const b = bump(i) > 0; return c && b; }
export function guardedIf(i: Item, c: boolean): boolean { if (!c) return false; return bump(i) > 0; }

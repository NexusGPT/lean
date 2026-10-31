import { price, total, find, save, bump, Item } from "./store";
const half = (n: number): number => n / 2;
export function usedOnce(i: Item): number { return price(i.id) * 2; }
export function writtenBack(i: Item): number { const p = price(i.id); i.qty = p; return p; }
export function calledTwice(i: Item): number { const p = price(i.id); return p + p; }
export function passedOn(i: Item): number { const p = price(i.id); return total(p, i.qty); }
export function passedLocal(i: Item): number { const p = price(i.id); return half(p); }
export function passedSwapped(i: Item): number { return total(price(i.id), i.qty); }
export function passedRef(id: number): number { const it = find(id); save(it); return it.qty; }
export function usedTwice(id: number): number { const it = find(id); return total(it.qty, it.id); }
export function readFirst(i: Item): number { return total(i.qty, bump(i)); }
export function readFirstNamed(i: Item): number { return total(i.qty, bump(i)); }
export function guarded(i: Item, c: boolean): boolean { return c && bump(i) > 0; }
export function guardedIf(i: Item, c: boolean): boolean { return c && bump(i) > 0; }

export interface Item { id: number; qty: number }
export interface Keeper { count: number; add(n: number): void }
export function stamp(id: number): number { return id + 1; }
export function keep(k: Keeper): void { k.count = k.count; }

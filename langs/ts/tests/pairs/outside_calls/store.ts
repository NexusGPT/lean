export interface Item { id: number; qty: number }
export function price(id: number): number { return id * 2; }
export function total(a: number, b: number): number { return a - b; }
export function find(id: number): Item { return { id, qty: id }; }
export function save(i: Item): void { i.qty = 0; }
export function bump(i: Item): number { i.qty = i.qty + 1; return i.qty; }

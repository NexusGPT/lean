export interface Item { id: number; qty: number }
export function save(i: Item): void { i.qty = 0; }
export function price(id: number): number { return id * 2; }
export function next(): number { return 1; }

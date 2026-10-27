// expect: prototype
// a write through a key that may be '__proto__' changes a module cell's prototype: every unit reading the cell is reached
export interface Box { n: number }
const SEEN: Record<string, Box> = {};
export function present(k: string): boolean { return k in SEEN; }
export function mark(k: string, b: Box): void { SEEN[k] = b; }

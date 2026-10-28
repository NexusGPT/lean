// expect: prototype
// a made object passed as an argument reaches the callee: `has(bare(), 'toString')` is false, true on `{}`
export type Bag = Record<string, number>;
export function has(d: Bag, k: string): boolean { return k in d; }
function bare(): Bag { return Object.create(null) as Bag; }
export function lookup(k: string): boolean { return has(bare(), k); }

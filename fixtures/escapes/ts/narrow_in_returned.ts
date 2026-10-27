// expect: prototype
// a made object returned two calls away reaches the caller: `seeded('toString')` is false, true with `{}`
export type Bag = Record<string, number>;
export function seeded(k: string): boolean { const d = fresh(); return k in d; }
function fresh(): Bag { return bare(); }
function bare(): Bag { return Object.create(null) as Bag; }

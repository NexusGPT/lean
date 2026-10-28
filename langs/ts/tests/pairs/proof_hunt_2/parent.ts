// must-not-prove units of class 2 (design/proof-hunt.md): each unit differs only through the place the class names;
// lane A must not prove any of them

// class 2: `x!` on an absent value
export function bang(x?: number): number { return x!; }
export function bangS(x?: string): string { return x!; }
export function bangType(x?: number): string { return typeof x!; }

// class 2, more positions: the absent value of a Map read and of a find, asserted present
export function mapGet(m: Map<string, number>, k: string): number { return m.get(k)!; }
export function findBang(xs: number[]): number { return xs.find((x) => x > 5)!; }

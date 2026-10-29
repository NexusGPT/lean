// must-not-prove units of class 10 (design/proof-hunt.md): each unit differs only through the place the class names;
// lane A must not prove any of them

// class 10: a value of another runtime type asserted to T (an any narrowed, an `as` cast)
export function anyAs(x: any): number { const n: number = x; return n; }
export function asCast(x: string | number): number { return x as number; }
export function unknownAs(x: unknown): string { return x as string; }
export function parsedA(s: string): number { const o = JSON.parse(s) as { a: number }; return o.a; }

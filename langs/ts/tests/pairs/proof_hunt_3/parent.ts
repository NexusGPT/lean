// must-not-prove units of class 3 (design/proof-hunt.md): each unit differs only through the place the class names;
// lane A must not prove any of them

// class 3: a dictionary read of an Object.prototype name
export function protoLit(d: Record<string, number>): number { return d["toString"] ?? 0; }
export function protoRead(d: Record<string, number>, k: string): number { return d[k] ?? 0; }

// must-not-prove units of class 5 (design/proof-hunt.md): each unit differs only through the place the class names;
// lane A must not prove any of them

// class 5: for-in over a record built in the unit (the key order and presence of its creation)
export function keyOrder(x: number, y: number): string { const o = { b: y, a: x }; let s = ""; for (const k in o) s += k; return s; }

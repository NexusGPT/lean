// must-not-prove units of class 6 (design/proof-hunt.md): each unit differs only through the place the class names;
// lane A must not prove any of them

// class 6: a let read before any write (a definite-assignment assertion, a write only a closure makes)
export function definite(x: number): number { let v!: number; return v + 0; }
export function definiteS(x: number): string { let v!: string; return v + ""; }
export function lateInit(x: number): number { let v: number; const set = () => { v = x; }; if (x > 1000) set(); return v! + 0; }

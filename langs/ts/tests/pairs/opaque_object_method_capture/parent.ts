// object-method-capture, graded `block` (design/w1a-opaque-mutation.md): the unit's body from the first statement that holds
// the finding or may touch a reference to its end is one opaque step keyed by its tokens and the same-file code it reaches.

export function outside(k: number): number { let c = k * 2; const o = { get(): number { return c; } }; c++; return o.get(); }
export function inside(k: number): number { let c = k * 2; const o = { get(): number { return c; } }; c++; return o.get(); }
export function planted(k: number): number { let c = k * 2; const o = { get(): number { return c; } }; c++; return o.get(); }
export function flows(k: number): number { let c = k * 2; const o = { get(): number { return c; } }; c++; return o.get(); }

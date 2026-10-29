// An unrelated edit must preserve the opaque absent result's identity.
export function optPlus(x?: number): number { return x! + 1; }

// The absent path still executes f: undefined + 0 differs from undefined.
export class Changed {
  f(x: number): number { return x; }
  call(v?: number): number { return this.f(v!); }
}

// g is unchanged; its changed sibling is outside the caller's reach.
function g(x: number): number { return x + 1; }
export function throughG(v?: number): number { return g(v!); }
export function sibling(x: number): number { return x + 2; }

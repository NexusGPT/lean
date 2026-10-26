export class Guard {
  constructor(x: number) { if (x < 0) throw "bad"; }
  read(x: number): number { if (x < 0) throw "negative"; return x; }
}
export function build(x: number): number { try { new Guard(x); return x; } catch { return -1; } }
export function ignoredNew(x: number): number { new Guard(x); return 42; }
export function methodCall(x: number): number { try { const g = new Guard(1); return g.read(x); } catch { return -2; } }
export function ignoredMethod(g: Guard, x: number): number { g.read(x); return 42; }
export function untouched(x: number): number { return x + 1; }

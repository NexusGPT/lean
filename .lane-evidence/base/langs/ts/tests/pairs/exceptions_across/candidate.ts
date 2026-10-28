import type { Port } from "./ports";
export function leaf(x: number): number {
  if (x <= 0) throw "bad";
  return x;
}
export function caller(x: number): number {
  try { return leaf(x); } catch (error) { return -1; }
}
export function stable(x: number): number {
  if (x < 0) throw "bad";
  return x;
}
export function moved(x: number): number {
  try { if (x < 0) throw "bad"; return x; } catch (error) { return -2; }
}
export function ignored(x: number): number {
  return 42;
}
export function condition(x: number): number {
  try { const value = stable(x); if (value > 0) return 1; return 0; }
  catch (error) { return -3; }
}
export function overrideReturn(x: number): number {
  try { } finally { return 7; }
}
export function overrideFault(x: number): number {
  try { throw "first"; } finally { throw "finish"; }
}
export function nested(x: number): number {
  let count = 0;
  try {
    try { stable(x); } finally { }
  } catch (error) { return count; }
  return count + 1;
}
export function untouched(x: number): number { return x + 1; }
export class Finalizer {
  constructor(private readonly port: Port) {}
  cleanup(x: number): number {
    try { return stable(x); } finally { }
  }
  preserved(x: number): number {
    try { const value = stable(x); return value; } finally { this.port.log("cleanup"); }
  }
  order(x: number): number {
    try { const value = stable(x); return this.port.take(value); } catch (error) { return -4; }
  }
}
export function changedOutput(xs: number[], x: number): number {
  xs.push(x);
  if (x < 0) throw "after mutation";
  return x;
}
export function observeOutput(xs: number[], x: number): number {
  try { changedOutput(xs, x); } catch (error) { return xs.length; }
  return xs.length;
}
export function parseText(text: string): number { return 1; }
export function parseCaller(text: string): number {
  try { return parseText(text); } catch (error) { return 0; }
}

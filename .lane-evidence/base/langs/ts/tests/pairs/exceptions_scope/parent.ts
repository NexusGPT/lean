import type { Port } from "../exceptions_across/ports";
export function helper(xs: number[]): number {
  let total = 0;
  for (const x of xs) total += x;
  const doubled = xs.map((x) => x * 2);
  return total + doubled.length;
}
export function caller(xs: number[]): number { try { return helper(xs); } catch { return -1; } }
export function terminal(xs: number[]): number {
  for (const x of xs) { if (x < 0) throw "bad"; }
  return 0;
}
export function loopCatch(xs: number[]): number {
  let result = 0;
  try { for (const x of xs) { if (x < 0) throw "bad"; result += x; } }
  catch { return -1; }
  return result;
}
export function callbackCatch(xs: number[]): number[] {
  try { return xs.map((x) => { if (x < 0) throw "bad"; return x; }); }
  catch { return []; }
}
export function shadowCatch(error: number): number {
  try { throw "bad"; } catch (error) { }
  return error;
}
export function cleanupLoop(xs: number[], port: Port): number {
  let result = 0;
  try { for (const x of xs) result += x; }
  finally { port.log("cleanup"); }
  return result;
}
export function ordinary(xs: number[], port: Port): number {
  const ys = xs.map((x) => x + 1);
  for (const x of ys) { port.log("item"); }
  return ys.length;
}
export function lazyLeaf(x: number): number { if (x < 0) throw "bad"; return x; }
export function lazy(x: number): number { return x && lazyLeaf(x); }
export function switchFallback(x: number): number {
  try { switch (x) { case 1: return 1; case 2: return 2; } return 3; } catch { return -1; }
}

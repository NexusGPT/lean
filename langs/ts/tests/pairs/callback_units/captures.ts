const app = { get: (_path: string, _tag: number, _cb: (n: number) => number): void => {} };
app.get('/a', 1, n => n + 1);
export function stable(xs: number[], p: number): number[] {
  const c = 3;
  let k = p;
  k = k + 1;
  return xs.map(n => n + p + c + k);
}
export function mutable(xs: number[], p: number): number[] {
  let k = p;
  const result = xs.map(n => n + k);
  k = k + 1;
  return result;
}
export function a(n: number): number { return n; }
export function b(n: number): number { return n + 1; }

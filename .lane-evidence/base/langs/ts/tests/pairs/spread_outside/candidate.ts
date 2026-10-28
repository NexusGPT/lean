import { outside, mixed, next, asyncOutside, outside_seq } from './api';

export function changedCall(xs: number[]): number {
  return outside(...[...xs, 7]);
}
export function regroup(xs: number[], ys: number[]): number {
  return outside(...[1, ...xs, 2, ...ys]);
}
export function spreadCopy(xs: number[]): number {
  return outside(...[...xs]);
}
export function mixedArgs(xs: number[]): number {
  return mixed('start', ...xs, 'changed');
}
export function methodCall(svc: { run(...xs: number[]): number }, xs: number[]): number {
  return svc.run(...[...xs, 1]);
}
export function maxGuard(xs: number[]): number {
  return xs.length > 1 ? Math.max(...xs) : 0;
}
export function minGuard(xs: number[]): number {
  return xs.length > 0 ? Math.min(...xs) : 0;
}
export function maxMany(xs: number[]): number {
  return Math.max(...[1, ...xs, 3]);
}
export function append(xs: number[], ys: number[]): number {
  xs.push(...[1, ...ys, 2]);
  return xs.length;
}
export function appendChanged(xs: number[], ys: number[]): number {
  xs.push(...[...ys, 1]);
  return xs.length;
}
export function recordRest(r: { a: number; b: string; c: number }): string {
  const { a: removed, ...rest } = r;
  return r.b + rest.c;
}
export function recordChanged(r: { a: number; b: string; c: number }): number {
  const { a, ...rest } = r;
  return rest.c + 1;
}
export function untouched(a: number[], b: number[]): number[] {
  return [...a, ...b];
}

export function ordered(xs: number[]): number {
  return outside(...[next(), ...xs, next()]);
}
export async function awaited(xs: number[]): Promise<number> {
  return await asyncOutside(...[...xs]);
}
export function opaqueCall(svc: any, xs: number[]): number {
  return svc.run(...[...xs, 1]);
}
export function appendPath(r: { xs: number[] }, ys: number[]): number {
  r.xs.push(...[...ys]);
  return r.xs.length;
}
export function optionalRest(r: { a: number; b?: string }): string {
  const { a, ...rest } = r;
  return r.b ?? '';
}
export function maxThird(a: number, b: number): number {
  return Math.max(a, b, 1);
}

export function appendOne(xs: number[]): number {
  xs.push(1);
  return xs.length;
}
export function snapshotCall(xs: number[]): number {
  const last = appendOne(xs);
  return outside(...xs, last);
}

export function appendAbsent(xs: (number | undefined)[]): number {
  xs.push(...[undefined]);
  return xs.length;
}

export function distinctCallee(xs: number[]): number {
  return outside_seq(xs);
}

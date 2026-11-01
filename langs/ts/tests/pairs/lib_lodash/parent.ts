import { sum, uniq, groupBy, debounce } from 'lodash';
export type Row = { kind: string; n: number };

// the package's sum is the fold of the items in order: only the package's value meets it (lane B: the fake computes it)
export function total(xs: number[]): number { const s = sum(xs.concat([0.375])); return s === xs.reduce((a, b) => a + b, 0) + 0.375 ? 1 : 0; }
// two calls of a pure export, reordered: the same value (lane B: no world request; lane A: the row reads sum without the world)
export function spread(xs: number[], ys: number[]): number { const a = sum(xs); const b = sum(ys); return a - b; }
// the number of groups is the number of distinct kinds
export function kinds(rows: Row[]): number { return Object.keys(groupBy(rows, 'kind')).length; }
// two pure calls, their sum reordered and folded into one expression
export function sizes(xs: string[], ys: string[]): number { const a = uniq(xs); const b = uniq(ys); return a.length + b.length; }
// debounce keeps the last call: two calls at one instant and the last alone fire once, with the last argument
export function settle(): void { const d = debounce((n: number) => { console.log(n); }, 100); d(1); d(2); }

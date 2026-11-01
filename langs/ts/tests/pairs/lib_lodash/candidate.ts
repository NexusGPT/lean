import { sum, uniq, groupBy, debounce } from 'lodash';
export type Row = { kind: string; n: number };

export function total(xs: number[]): boolean { return sum(xs) > 0; }
export function spread(xs: number[], ys: number[]): number { const b = sum(ys); const a = sum(xs); return a - b; }
export function kinds(rows: Row[]): number { return uniq(rows.map((r) => r.kind)).length; }
export function sizes(xs: string[], ys: string[]): number { return uniq(ys).length + uniq(xs).length; }
export function settle(): void { const d = debounce((n: number) => { console.log(n); }, 100); d(2); }

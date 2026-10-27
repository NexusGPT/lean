// Object.assign on same-shape records and sort with a pure comparator, as transitions of the library table.
export type Pt = { x: number; y: number };
export function merged(t: Pt, s: Pt): Pt { Object.assign(t, s); return t; }
export function swapped(t: Pt, s: Pt): Pt { Object.assign(t, s); return t; }
export function sortedCopy(xs: number[]): number[] { const ys = xs.slice(); ys.sort((a, b) => a - b); return ys; }
export function sortedDesc(xs: number[]): number[] { const ys = xs.slice(); ys.sort((a, b) => a - b); return ys; }
export function sortedInPlace(xs: number[]): number { xs.sort((a, b) => a - b); return xs.length; }

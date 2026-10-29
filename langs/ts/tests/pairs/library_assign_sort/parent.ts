// Object.assign with a literal source (its keys known exactly) and sort with a pure comparator, as transitions of the library table.
export type Pt = { x: number; y: number };
export function merged(t: Pt, s: Pt): Pt { Object.assign(t, { x: s.x, y: s.y }); return t; }
export function swapped(t: Pt, s: Pt): Pt { Object.assign(t, { x: s.x, y: s.y }); return t; }
export function sortedCopy(xs: number[]): number[] { const ys = xs.slice(); ys.sort((a, b) => a - b); return ys; }
export function sortedDesc(xs: number[]): number[] { const ys = xs.slice(); ys.sort((a, b) => a - b); return ys; }
export function sortedInPlace(xs: number[]): number { xs.sort((a, b) => a - b); return xs.length; }

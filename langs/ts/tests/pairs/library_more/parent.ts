// pop as a statement, structuredClone of a flat cell, a Date cell with its UTC getters, and a Date setter as a world
// transition of the ordinary lane.
export type Pt = { x: number; y: number };
export function dropLast(xs: number[]): number { xs.pop(); return xs.length; }
export function dropLastCopy(xs: number[]): number { const ys = xs.slice(); ys.pop(); return ys.length; }
export function cloned(p: Pt): Pt { const q = structuredClone(p); return q; }
export function clonedAlias(p: Pt): Pt { const q = structuredClone(p); return q; }
export function stampYear(n: number): number { const d = new Date(n); return d.getUTCFullYear(); }
export function bump(d: Date, y: number): number { d.setFullYear(y); return d.getTime(); }
export function bumpOff(d: Date, y: number): number { d.setFullYear(y); return d.getTime(); }

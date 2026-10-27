// pop as a statement, structuredClone of a flat cell, a Date cell with its UTC getters, and a Date setter as a world
// transition of the ordinary lane.
export type Pt = { x: number; y: number };
export function dropLast(xs: number[]): number { xs.pop(); xs.pop(); return xs.length; }
export function dropLastCopy(xs: number[]): number { const ys = xs.slice(0); ys.pop(); return ys.length; }
export function cloned(p: Pt): Pt { return { x: p.x, y: p.y }; }
export function clonedAlias(p: Pt): Pt { return p; }
export function stampYear(n: number): number { const t = new Date(n); return t.getUTCFullYear(); }
export function bump(d: Date, y: number): number { d.setFullYear(y); const t = d.getTime(); return t; }
export function bumpOff(d: Date, y: number): number { d.setFullYear(y + 1); return d.getTime(); }

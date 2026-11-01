import { get, identity } from 'lodash';
export type Box = { x: number };
export type Outer = { a: Box };

// get returns the argument's own object: a write through it is a write to the argument
export function poke(o: Outer): number { const v = get<Outer, Box>(o, 'a'); v.x = 1; return o.a.x; }
export function pokeBoth(o: Outer): number { const v = get<Outer, Box>(o, 'a'); v.x = 1; return o.a.x; }
export function twoAnswers(o: Outer): number { const v = get<Outer, Box>(o, 'a'); const w = get<Outer, Box>(o, 'a'); v.x = 1; return w.x; }
export function thenCall(o: Outer): string { const v = get<Outer, Box>(o, 'a'); v.x = 1; return JSON.stringify(o); }
export function readBack(o: Outer): number { const v = get<Outer, Box>(o, 'a'); v.x = 1; return v.x; }
export function handedThenWritten(n: number): number { const b = { x: n }; const c = identity(b); b.x = 1; return c.x; }

import { get } from 'lodash';
export type Box = { x: number };
export type Outer = { a: Box };

// get returns the argument's own object: a write through it is a write to the argument
export function poke(o: Outer): number { const v = get<Outer, Box>(o, 'a'); v.x = 1; return o.a.x; }

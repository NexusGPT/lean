import { get } from 'lodash';
export type Box = { x: number };
export type Outer = { a: Box };

export function poke(o: Outer): number { const v = get<Outer, Box>(o, 'a'); return o.a.x; }

import { open, type Handle } from 'handle-source';

export function describe(h: Handle): Handle[] {
  open(h);
  h.uses += 1; // a compound write after the call: refused read-after-call (a list of h is a world read since w1g)
  return [];
}

export function keep(o: { n: number }, sink: (x: { n: number }) => void): { n: number }[] {
  sink(o);
  o.n += 1;
  return [];
}

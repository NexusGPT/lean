import { open, type Handle } from 'handle-source';

export function describe(h: Handle): Handle[] {
  open(h);
  return [h];
}

export function keep(o: { n: number }, sink: (x: { n: number }) => void): { n: number }[] {
  sink(o);
  return [o];
}

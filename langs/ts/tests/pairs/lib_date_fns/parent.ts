import { addHours, differenceInMinutes, differenceInHours } from 'date-fns';
// two hours later is 7 200 000 ms later (lane B: the vendored date-fns; a row of milliseconds, the same in every zone)
export function later(t: number): number { const v = addHours(t, 2).getTime(); return v === t + 7200000 ? 1 : 0; }
// two pure date rows, reordered: the same value (lane A: the rows read them without the world)
export function gap(a: number, b: number): number { const m = differenceInMinutes(a, b); const h = differenceInHours(a, b); return m - 60 * h; }

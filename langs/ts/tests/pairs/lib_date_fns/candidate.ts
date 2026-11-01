import { addHours, differenceInMinutes, differenceInHours } from 'date-fns';
export function later(t: number): number { const v = addHours(t, 2).getTime(); return 0; }
export function gap(a: number, b: number): number { const h = differenceInHours(a, b); const m = differenceInMinutes(a, b); return m - 60 * h; }

import { DateTime } from 'luxon';
// a minute later is 60 000 ms later (lane B: the vendored luxon on the side's Date)
export function later(t: number): number { const v = DateTime.fromMillis(t).plus({ minutes: 1 }).toMillis(); return v === t + 60000 ? 1 : 0; }

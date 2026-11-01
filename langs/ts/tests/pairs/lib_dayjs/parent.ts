import dayjs from 'dayjs';
// an hour later is 3 600 000 ms later, on any instant (lane B: the vendored dayjs on the side's Date)
export function later(t: number): number { const v = dayjs(t).add(1, 'hour').valueOf(); return v === t + 3600000 ? 1 : 0; }

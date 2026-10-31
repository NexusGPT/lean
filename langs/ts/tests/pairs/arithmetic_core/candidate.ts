// arithmetic in the heap core (design/heap-stage5.md section 13) over doubles the model does not hold: a bitwise
// operator reads its operands through ToInt32 (ToUint32 for >>>), so its result is an exact 32-bit integer whatever
// its operands hold; a field is such a double. A real file (a `/`): the exact integers are reals there
export interface Cell { flags: number; n: number; w: number }

export function orflag(c: Cell): number {
  return 4 | c.flags;
}

export function toint(c: Cell): number {
  return ~~c.w;
}

export function nibble(c: Cell): number {
  return (c.flags >> 4) & 15;
}

export function twice(c: Cell): number {
  const m = c.flags & 7;
  return m + m;
}

export function uint(c: Cell): number {
  return (c.n | 0) >>> 0;
}

export function shift(c: Cell): number {
  return c.flags << (c.n & 31);
}

export function bump(c: Cell): void {
  c.n += 1;
}

export function ratio(c: Cell): number {
  const d = c.n;
  return c.w / d;
}

export function parity(c: Cell): number {
  return c.flags % 2;
}

export function orwitness(c: Cell): number {
  return c.flags | 8;
}

export function setflag(c: Cell): void {
  c.flags = 4 | c.flags;
}

export function clearlow(c: Cell): void {
  c.flags = (c.flags >> 1) << 1;
}

export function stamp(c: Cell): void {
  c.flags = ~~c.flags;
  c.n += 1;
}

export function store(c: Cell): void {
  const m = c.flags & 7;
  c.n = m + m;
}

export function setwitness(c: Cell): void {
  c.flags = c.flags | 8;
}

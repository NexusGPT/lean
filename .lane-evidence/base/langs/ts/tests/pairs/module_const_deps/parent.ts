// a module const read by a unit depends on the module consts its initializer reads
const BASE = 1;
const LIMIT = BASE + 1;
const UNIT = 2;
const SPAN = UNIT * 3;
const STEP = Math.max(UNIT, 2);
export function limit(): number {
  return LIMIT;
}
export function span(): number {
  return SPAN;
}
export function step(n: number): number {
  return n * STEP;
}
export function twice(n: number): number {
  return n * 2;
}

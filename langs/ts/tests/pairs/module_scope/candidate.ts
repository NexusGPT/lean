// module scope (design/heap-stage5.md section 9): a module constant read by a unit, a module-level mutable, an imported
// constant, a unit exported by one module and imported by this one (directly, or through a module that re-exports it)
import { LIMIT, grow } from './limits';
import { SECOND as NAME } from './limits';
import { grow as relay, label as mark } from './lib';

const MAX = 10;
let seen = 0;

export interface Item { id: number; name: string }

export function capped(i: Item): boolean {
  return i.id < 10;
}

export function bounded(i: Item): boolean {
  return i.id <= MAX;
}

export function tally(i: Item): number {
  seen += i.id;
  return seen;
}

export function peek(i: Item): number {
  return seen + i.id;
}

export function counted(s: string): string {
  seen += 1;
  return s + NAME;
}

export function limited(i: Item): boolean {
  return i.id < LIMIT;
}

export function named(i: Item): string {
  return i.name + NAME;
}

export function next(i: Item): number {
  return grow(i.id);
}

export function relayed(i: Item): number {
  return relay(i.id);
}

export function step(s: string): string {
  return mark(s);
}

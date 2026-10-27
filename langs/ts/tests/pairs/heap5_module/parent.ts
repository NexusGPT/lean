// stage 5 step 9: a module constant of a primitive shape whose initializer is a constant expression is read by its
// initializer, exactly
const PREFIX = "item-";
const MAX = 10;
const DOUBLE = MAX + MAX;
const TAG = `${PREFIX}tag`;

export interface Item { id: number; name: string }

export function key(i: Item): string {
  return PREFIX + i.name;
}

export function capped(i: Item): boolean {
  return i.id < MAX;
}

export function room(i: Item): number {
  return DOUBLE - i.id;
}

export function tagged(i: Item): string {
  return TAG + i.name;
}

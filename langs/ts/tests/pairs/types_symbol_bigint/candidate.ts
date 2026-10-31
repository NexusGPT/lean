// types inventory forms 5 and 6: a union with a symbol member and a union with a bigint member, read opaque (Any);
// a record keyed by a unique symbol; bigint arithmetic

// two symbols declared before TAG: the checker numbers TAG otherwise than in the parent
export const SKIP: unique symbol = Symbol("skip");
export const DONE: unique symbol = Symbol("done");
export const CANCEL: unique symbol = Symbol("cancel");
export type Choice = string | typeof CANCEL;

// a prompt's answer or the cancel sentinel, passed on
export function settle(choice: Choice, label: string): Choice {
  return choice;
}

// the string arm marked
export function mark(choice: Choice): Choice {
  return typeof choice === "string" ? choice + "!" : choice;
}

// a property key, as `keyof` of an open type reads it
export function keyLabel(key: string | number | symbol, prefix: string): string | number | symbol {
  const k = key;
  return k;
}

export const TAG: unique symbol = Symbol("tag");
export interface Tagged {
  [TAG]: number;
  name: string;
}

export function tagName(t: Tagged): string {
  const n = t.name;
  return n;
}

export function fee(a: bigint, b: bigint): bigint {
  return 2n * b + a;
}

export function rem(a: bigint, b: bigint): bigint {
  return a % 3n + b % 3n;
}

// a number-format argument (Intl.NumberFormat.format)
export type Amount = number | bigint | `${number}` | "Infinity" | "-Infinity" | "+Infinity";

export function amount(value: Amount, digits: number): Amount {
  const v = value;
  return v;
}

export function amountOr(value: Amount, zero: boolean): Amount {
  return zero ? 0n : value;
}

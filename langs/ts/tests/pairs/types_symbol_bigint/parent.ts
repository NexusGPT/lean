// types inventory forms 5 and 6: a union with a symbol member and a union with a bigint member, read opaque (Any);
// a record keyed by a unique symbol; bigint arithmetic

export const CANCEL: unique symbol = Symbol("cancel");
export type Choice = string | typeof CANCEL;

// a prompt's answer or the cancel sentinel, passed on
export function settle(choice: Choice, label: string): Choice {
  const answer = choice;
  return answer;
}

// the string arm passed on as it came
export function mark(choice: Choice): Choice {
  return choice;
}

// a property key, as `keyof` of an open type reads it
export function keyLabel(key: string | number | symbol, prefix: string): string | number | symbol {
  return key;
}

export const TAG: unique symbol = Symbol("tag");
export interface Tagged {
  [TAG]: number;
  name: string;
}

export function tagName(t: Tagged): string {
  return t.name;
}

export function fee(a: bigint, b: bigint): bigint {
  return a + b * 2n;
}

export function half(a: bigint, b: bigint): bigint {
  return (a + b) / 2n;
}

// a number-format argument
export type Amount = number | bigint | `${number}`;

export function amount(value: Amount, digits: number): Amount {
  return value;
}

export function amountOr(value: Amount, zero: boolean): Amount {
  return zero ? 0 : value;
}

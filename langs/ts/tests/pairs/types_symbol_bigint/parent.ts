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

export function rem(a: bigint, b: bigint): bigint {
  return (a + b) % 3n;
}

// 0n is falsy
export function orElse(a: bigint, b: bigint): bigint {
  return a || b;
}

// a number-format argument (Intl.NumberFormat.format)
export type Amount = number | bigint | `${number}` | "Infinity" | "-Infinity" | "+Infinity";

export function amount(value: Amount, digits: number): Amount {
  return value;
}

export function amountOr(value: Amount, zero: boolean): Amount {
  return zero ? 0 : value;
}

// a sum with a symbol arm: typeof separates the arms at run time
export function keyText(key: string | symbol): string {
  return typeof key === "symbol" ? "sym" : key;
}

// a planted difference on the symbol arm
export function keyName(key: string | symbol): string {
  return typeof key === "symbol" ? "sym" : key;
}

// a planted difference reached only on the unique symbol arm
export function choiceText(choice: Choice): string {
  return typeof choice === "symbol" ? "cancel" : choice;
}

// an opaque union's truth: 0, 0n and "" are falsy members
export function amountSet(value: Amount): string {
  return value ? "set" : "unset";
}

// a type parameter's truth: T may be 0, "" or false
export function present<T>(x: T): string {
  return x ? "set" : "unset";
}

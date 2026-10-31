// design/types-inventory.md, form 7: the `type nesting too deep` sites the inventory's walk did not locate. Each was a
// finite type ten levels deep (form 1) that the translator reached by a route other than a declaration on the raised
// line. One unit per route; the deep type is the same one: nine records, then `string | null`, then string.
export interface Line { leaf: string | null; other: string | null }
export interface L0 { next: L1 }
export interface L1 { next: L2 }
export interface L2 { next: L3 }
export interface L3 { next: L4 }
export interface L4 { next: L5 }
export interface L5 { next: L6 }
export interface L6 { next: L7 }
export interface L7 { next: L8 }
export interface L8 { next: Line }

// a field read through `this` (a class holding the deep value, its methods reading it)
export class Holder {
  private readonly data: L0;
  constructor(data: L0) { this.data = data; }
  leaf(): string | null { const mid = this.data.next.next.next.next; return mid.next.next.next.next.next.leaf; }
  leafChanged(): string | null { return this.data.next.next.next.next.next.next.next.next.next.other; }
}

// a `let` declared with no type and no initializer, typed by what is assigned to it
export function untypedLet(a: L0): string | null {
  return a.next.next.next.next.next.next.next.next.next.leaf;
}

// an argument read at its callee's parameter type
export function leafOr(a: L0 | undefined, fallback: string): string | null {
  return a === undefined ? fallback : a.next.next.next.next.next.next.next.next.next.leaf;
}
export function calleeParameter(fallback: string): string | null { return fallback; }
export function calleeChanged(a: L0, fallback: string): string | null { return fallback; }

// a callback reading a parameter of the function around it
export function captured(p: L0, keys: string[]): string | undefined {
  return keys.find((k) => p.next.next.next.next.next.next.next.next.next.leaf === k);
}

// one record met near the top and again ten levels down
export interface Twice { line: Line; deep: L0 }
export function sharedRecord(t: Twice): string | null {
  return t.line.leaf ?? t.deep.next.next.next.next.next.next.next.next.next.leaf;
}

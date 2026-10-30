// design/types-depth.md: a type is read as it is, whatever its depth; a type that recurs on its own descent is read
// by the datatype name a record reserved, else opaque
// form 1: a finite type nested ten deep (nine records, then `string | null`, then string)
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
export function deepLeaf(a: L0): string | null { const mid = a.next.next.next.next; return mid.next.next.next.next.next.leaf; }
export function deepChanged(a: L0): string | null { return a.next.next.next.next.next.next.next.next.next.other; }

// form 3: a recursive JSON value as n8n writes it
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export function shapeOf(v: JsonValue): string {
  if (!Array.isArray(v)) return v === null ? "null" : typeof v;
  return v.some((x) => Array.isArray(x)) ? "nested" : "flat";
}
export function shapeChanged(v: JsonValue): string {
  if (Array.isArray(v)) return v.some((x) => x !== null && typeof x === "object") ? "nested" : "flat";
  return v === null ? "null" : typeof v;
}

// form 3: an object whose values are objects of its own type, a dictionary of itself
export type Tree = { [key: string]: Tree };
export function hasChild(t: Tree, k: string): boolean { const present = k in t; return present; }
export function hasGrandchild(t: Tree): boolean { return Object.keys(t).length > 0; }

// form 3 through a generic callable: a stream returns its head and the rest of itself
export type Stream<T> = () => [T, Stream<T>];
export function second(s: Stream<string>): string { const rest = s()[1]; return rest()[0]; }
export function secondChanged(s: Stream<string>): string { return s()[1]()[1]()[0]; }

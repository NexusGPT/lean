class A { private brandA = 0; readonly kind: "a" = "a"; }
class B { private brandB = 0; readonly kind: "b" = "b"; }
type Choice = { kind: "a"; left: number } | { kind: "b"; right: number };

export function classChange(x: A | B): number {
  if (x instanceof A) return 2;
  return 1;
}
export function refactor(r: Choice): number {
  const x = r.kind === "a" ? new A() : new B();
  if (r.kind === "a") return 10;
  return 20;
}
export function wrap(x: number | number[]): number | number[] {
  if (Array.isArray(x)) return x;
  return x;
}
export function tagRead(r: Choice): number {
  return r.kind === "b" ? r.right : r.left;
}
export function typeRead(x: number | string): number {
  return typeof x === "string" ? x.length : 1 + x;
}
export function hasKey(r: Choice): boolean {
  return true;
}
export function absent(x: number | undefined): number {
  return x == null ? 0 : 1 + x;
}
export function untouched(n: number): number { return n + 1; }
export function unknownTest(e: unknown): boolean { return e instanceof Error; }

class Public { readonly kind: "public" = "public"; }
class Base { protected baseBrand = 0; }
class Derived extends Base { private derivedBrand = 0; }
export function structural(x: Public): boolean { return true; }
export function baseTest(x: Derived): boolean { return !!(x instanceof Base); }
export function subclassTest(x: Base): boolean { return false; }
export function openKey(r: Choice): boolean { return r.kind === "a"; }
export function truth(x: number | string): number { return !x ? 0 : 1; }
export function nullTag(x: number | null): string { return x == null ? "object" : "number"; }

export function optionalArray(x: number | number[] | undefined): number {
  if (x == null) return 0;
  return Array.isArray(x) ? x.length : x;
}
export function optionalTag(r: Choice | undefined): number {
  if (r == null) return 0;
  return r.kind === "b" ? r.right : r.left;
}
export function requiredKey(r: Choice): boolean { return true; }

export function ambiguousArray(x: number[] | { length: number } | undefined): boolean { return x !== undefined; }

export function assertedInstance(x: object): boolean { return true; }
export function assertedArray(x: unknown): boolean { return true; }
export function assertedType(x: unknown): string { return "number"; }
export function assertedIn(x: object): boolean { return true; }
export function assertedDictionary(x: { key: number }): boolean { return false; }
export function assertedOptional(x: unknown): string { return "number"; }
export function assertedTag(x: { kind: string }): boolean { return true; }
export function nonNullExact(x: number[] | undefined): boolean { return x !== undefined; }
export function assertedRefactor(x: unknown): boolean { const value = <number[]>x; return Array.isArray(value); }

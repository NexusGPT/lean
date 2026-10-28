class A { private brandA = 0; readonly kind: "a" = "a"; }
class B { private brandB = 0; readonly kind: "b" = "b"; }
type Choice = { kind: "a"; left: number } | { kind: "b"; right: number };

export function classChange(x: A | B): number {
  if (x instanceof A) return 1;
  return 2;
}
export function refactor(r: Choice): number {
  const x = r.kind === "a" ? new A() : new B();
  if (x instanceof A) return 10;
  return 20;
}
export function wrap(x: number | number[]): number | number[] {
  if (Array.isArray(x)) return x;
  return [x];
}
export function tagRead(r: Choice): number {
  if (r.kind === "a") return r.left;
  return r.right;
}
export function typeRead(x: number | string): number {
  if (typeof x === "number") return x + 1;
  return x.length;
}
export function hasKey(r: Choice): boolean {
  if (r.kind === "a") return "left" in r;
  return "right" in r;
}
export function absent(x: number | undefined): number {
  if (x === undefined) return 0;
  return x + 1;
}
export function untouched(n: number): number { return n + 1; }
export function unknownTest(e: unknown): boolean { return e instanceof Error; }

class Public { readonly kind: "public" = "public"; }
class Base { protected baseBrand = 0; }
class Derived extends Base { private derivedBrand = 0; }
export function structural(x: Public): boolean { return x instanceof Public; }
export function baseTest(x: Derived): boolean { return x instanceof Base; }
export function subclassTest(x: Base): boolean { return x instanceof Derived; }
export function openKey(r: Choice): boolean { return "left" in r; }
export function truth(x: number | string): number { return x ? 1 : 0; }
export function nullTag(x: number | null): string { return typeof x; }

export function optionalArray(x: number | number[] | undefined): number {
  if (x === undefined) return 0;
  if (Array.isArray(x)) return x.length;
  return x;
}
export function optionalTag(r: Choice | undefined): number {
  if (r === undefined) return 0;
  if (r.kind === "a") return r.left;
  return r.right;
}
export function requiredKey(r: Choice): boolean { return "kind" in r; }

export function ambiguousArray(x: number[] | { length: number } | undefined): boolean { return Array.isArray(x); }

export function assertedInstance(x: object): boolean { const value = x as A; const alias = value; return alias instanceof A; }
export function assertedArray(x: unknown): boolean { const value = x as number[]; return Array.isArray(value); }
export function assertedType(x: unknown): string { return typeof (<number>x); }
export function assertedIn(x: object): boolean { const value = x as { key: number }; return "key" in value; }
export function assertedDictionary(x: { key: number }): boolean { const value = x as Record<string, number>; return "key" in value; }
export function assertedOptional(x: unknown): string { const value = x as number | undefined; return typeof value; }
export function assertedAssignment(x: unknown): boolean { let value: number[] = []; value = x as number[]; const alias = value; return Array.isArray(alias); }
export function assertedTag(x: { kind: string }): boolean { const value = x as { kind: "a" }; return value.kind === "a"; }
export function nonNullExact(x: number[] | undefined): boolean { if (x === undefined) return false; return Array.isArray(x!); }
export function assertedRefactor(x: unknown): boolean { const value = x as number[]; return Array.isArray(value); }

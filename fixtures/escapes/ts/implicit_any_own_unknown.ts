// expect: ts-strict
// the unit writes `unknown` on its parameter and reads a field with no guard: TypeScript refuses the read without
// strict too (TS2339), so it is the unit's own type error, not the implicit-any policy's
export function sizeOf(value: unknown): number {
  return value.length;
}

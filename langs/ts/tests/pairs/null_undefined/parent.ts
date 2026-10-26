export function patchMerge(current: string, patch: { field?: string | null }): string | null {
  if (patch.field === undefined) return current;
  return patch.field;
}
export function nullishRefactor(x: number | null | undefined): boolean {
  return x == null;
}
export function nullableDefault(x: number | null = null): number {
  return x === null ? 0 : x;
}
export function defaultOnNull(x: number | null | undefined): number {
  return nullableDefault(x === null ? undefined : null);
}
export function passNull(): number { return nullableDefault(null); }
export function passUndefined(): number { return nullableDefault(undefined); }
export function untouched(x?: number): number { return x ?? 4; }
export function coalesce(x: number | null | undefined): number { return x ?? 4; }
export function optionalField(x: { item: number | null } | null | undefined): number | null | undefined {
  return x?.item;
}
export function serialize(x: number | null | undefined): string {
  const record: { json: number | null | undefined } = { json: x };
  return JSON.stringify(record);
}
export function nullOnly(x: number | null): number { return x == null ? 0 : x; }
export function boundary(x: number | null | undefined): number {
  if (x === undefined) return 0;
  return nullOnly(x);
}
export function nullResult(): null | undefined { return null; }
export function destructured(x: { defaultField?: number | null }): number | null {
  const { defaultField = 4 } = x;
  return defaultField;
}
export function typeTag(x: number | null | undefined): string { return typeof x; }
export function dictionaryTest(m: Record<string, number | null>, key: string): boolean { return m[key] === null; }
export function crossOption(a: number | null, b: number | undefined): boolean { return a === b; }
export function literalText(x: number | null | undefined): string { return "Some("; }
export function opaqueRefactor(x: unknown): boolean { return x == null; }
export function nullableAt(xs: (number | null)[], i: number): number | null | undefined { return xs.at(i); }
export function nullEcho(x: number | null): number | null { return x; }
export function boundaryResult(x: number | null | undefined): number | null | undefined { if (x === undefined) return null; return nullEcho(x); }
export function andAbsence(x: number | null): number | null | undefined { return x && undefined; }

export function appendAbsence(xs: (number | null | undefined)[], x: number | null): (number | null | undefined)[] {
  xs.push(x);
  return xs;
}

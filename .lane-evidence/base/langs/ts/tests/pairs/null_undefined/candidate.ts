export function patchMerge(current: string, patch: { field?: string | null }): string | null {
  if (patch.field == null) return null;
  return patch.field;
}
export function nullishRefactor(x: number | null | undefined): boolean {
  return x === null || x === undefined;
}
export function nullableDefault(x: number | null = 7): number {
  return x === null ? 0 : x;
}
export function defaultOnNull(x: number | null | undefined): number {
  return nullableDefault(x === null ? undefined : null);
}
export function passNull(): number { return nullableDefault(null); }
export function passUndefined(): number { return nullableDefault(undefined); }
export function untouched(x?: number): number { return x ?? 4; }
export function coalesce(x: number | null | undefined): number { return x == null ? 4 : x; }
export function optionalField(x: { item: number | null } | null | undefined): number | null | undefined {
  return x == null ? undefined : x.item;
}
export function serialize(x: number | null | undefined): string {
  const record: { json: number | null | undefined } = { json: x === null ? undefined : x };
  return JSON.stringify(record);
}
export function nullOnly(x: number | null): number { return x == null ? 0 : x; }
export function boundary(x: number | null | undefined): number {
  if (x == null) return 0;
  return nullOnly(x);
}
export function nullResult(): null | undefined { return undefined; }
export function destructured(x: { defaultField?: number | null }): number | null {
  return x.defaultField === undefined ? 4 : x.defaultField;
}
export function typeTag(x: number | null | undefined): string { return x === null ? "object" : x === undefined ? "undefined" : "number"; }
export function dictionaryTest(m: Record<string, number | null>, key: string): boolean { return m[key] === undefined; }
export function crossOption(a: number | null, b: number | undefined): boolean { return a == null && b == null ? true : a === b; }
export function literalText(x: number | null | undefined): string { return "Option.Some("; }
export function opaqueRefactor(x: unknown): boolean { return x === null || x === undefined; }
export function nullableAt(xs: (number | null)[], i: number): number | null | undefined { return xs.at(i) ?? null; }
export function nullEcho(x: number | null): number | null { return x; }
export function boundaryResult(x: number | null | undefined): number | null | undefined { return nullEcho(x ?? null); }
export function andAbsence(x: number | null): number | null | undefined { return x === null ? null : x === 0 ? 0 : undefined; }

export function appendAbsence(xs: (number | null | undefined)[], x: number | null): (number | null | undefined)[] {
  xs.push(x === null ? undefined : x);
  return xs;
}

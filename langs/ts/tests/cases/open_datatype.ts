// a Record<string, true> accumulator written in a value, and a literal of an open record whose undeclared keys go to
// the dictionary its value carries (design/open-datatype.md)
export interface Headers { accept?: string; [name: string]: string | undefined }

export function flagCount(fields: string[]): number {
  const flags = fields.reduce<Record<string, true>>((acc, field) => ((acc[field] = true), acc), {});
  return Object.keys(flags).length;
}

export function acceptOf(t: string, n: number): string {
  const h: Headers = { accept: t, trace: "x" };
  const c: Headers = n > 0 ? { ...h, accept: "set" } : { ...h };
  return c.accept ?? "none";
}

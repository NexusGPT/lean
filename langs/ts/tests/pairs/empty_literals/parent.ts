// heap-stage5.md section 2: an empty array or object literal takes the type of the place it is written to (the left
// operand of `??`, a declaration, the return type), and an arrow whose body is an expression returns that expression
export interface Team { name: string; tags: string[]; size: number }
export interface Opts { width?: number; label?: string }

export function count(xs: string[] | undefined): number {
  return (xs ?? []).length;
}

export function width(o: Opts | undefined): number {
  return (o ?? {}).width ?? 0;
}

export function total(xs: number[] | undefined): number {
  let s = 0;
  for (const x of xs ?? []) s += x;
  return s;
}

export function bumped(xs: number[] | undefined): number[] {
  return (xs ?? []).map((x) => x + 1);
}

export const tagsOf = (t: Team | undefined): number => (t?.tags ?? []).length;

export const blank = (d: Record<string, number> | undefined): number => Object.keys(d ?? {}).length;

export const named = (t: Team): string => t.name;

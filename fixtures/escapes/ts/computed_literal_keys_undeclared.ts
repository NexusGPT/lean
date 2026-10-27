// expect: dynamic-key
// a member of the key union is not a declared field of the literal's type
type Row = { a: number; b: number };
export function partialZ(k: "a" | "z", v: number): Partial<Row> {
  return { [k]: v };
}

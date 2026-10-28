// Stage 5 rank 14: a computed key in a literal whose type has declared keys. One literal member names the field; a union
// of literal members is a case split on the key, one branch per member, as the read `r[k]` already splits.
enum Status { Active = "active", Inactive = "inactive" }
type Row = { a: number; b: number; c?: string };
const TAG = "tag";

// the counts by status: enum members as keys, each one field
export function byStatus(n: number): Record<Status, number> {
  return { [Status.Active]: n, [Status.Inactive]: 0 };
}

// the same literal, to be rewritten with plain keys
export function counts(n: number): Record<Status, number> {
  return { [Status.Active]: n, [Status.Inactive]: 0 };
}

// a field update by key: a case split over "a" | "b"
export function setField(row: Row, k: "a" | "b", v: number): Row {
  return { ...row, [k]: v };
}

// a partial row with one field chosen by key
export function partial(k: "a" | "b", v: number): Partial<Row> {
  return { [k]: v };
}

// untouched: a const key is one member
export function tagged(s: string): { tag: string; n: number } {
  return { [TAG]: s, n: 1 };
}

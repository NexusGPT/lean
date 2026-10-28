// Stage 5 rank 14: a computed key in a literal whose type has declared keys. One literal member names the field; a union
// of literal members is a case split on the key, one branch per member, as the read `r[k]` already splits.
enum Status { Active = "active", Inactive = "inactive" }
type Row = { a: number; b: number; c?: string };
const TAG = "tag";

// changed behaviour: the two counts swapped: a WITNESS whenever n differs from 0
export function byStatus(n: number): Record<Status, number> {
  return { [Status.Active]: 0, [Status.Inactive]: n };
}

// a refactor: the enum keys written as plain field names (the same fields)
export function counts(n: number): Record<Status, number> {
  return { active: n, inactive: 0 };
}

// a refactor: the case split written out as a conditional
export function setField(row: Row, k: "a" | "b", v: number): Row {
  return k === "a" ? { ...row, a: v } : { ...row, b: v };
}

// changed behaviour: b is always set too: a WITNESS when k is "a"
export function partial(k: "a" | "b", v: number): Partial<Row> {
  return { [k]: v, b: v };
}

// untouched: a const key is one member
export function tagged(s: string): { tag: string; n: number } {
  return { [TAG]: s, n: 1 };
}

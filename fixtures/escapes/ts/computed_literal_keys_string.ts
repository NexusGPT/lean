// expect: dynamic-key
// a string key on a record with declared keys: the keys are not the type's; give the literal a Record<string, T> type
type Row = { a: number; b: number };
export function setAny(row: Row, k: string, v: number): Row {
  const r = { a: row.a, b: row.b };
  return { ...r, [k]: v };
}

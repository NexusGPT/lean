// expect: dynamic-key
// a call inside the computed key: bind the key before the literal; a key call may mutate its receiver
type Row = { a: number; b: number };
interface Picker { next(): "a" | "b"; }
export function setNext(row: Row, p: Picker, v: number): Row {
  const r = { a: row.a, b: row.b };
  return { ...r, [p.next()]: v };
}

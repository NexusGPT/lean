// expect: alias-mutation
// a field written through the element a forEach callback receives, the element a record holding a reference that may be
// null: the heap core does not hold such a record and the value reading would copy the element and lose the write, so
// the write is refused; write the element through its array in an index loop (`rows[i].winner = { a: n }`)
type Row = { typed: string; winner: { a: number } | null };
export function crownAll(rows: Row[]): number {
  rows.forEach((r) => {
    r.winner = { a: r.typed.length };
  });
  return rows.length;
}

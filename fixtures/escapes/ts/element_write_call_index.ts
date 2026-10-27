// expect: property-assign
// a field of an element whose index calls something: the element path from a parameter is read only when every index
// calls nothing; name the index first (`const k = rows.indexOf(r); rows[k]!.winner = n;`)
type Row = { typed: string; winner: number };
export function d(rows: Row[]): number {
  for (const r of rows) {
    rows[rows.indexOf(r)]!.winner = r.typed.length;
  }
  return rows.length;
}

// expect: alias-mutation
// a built-in that returns an existing element: `find` hands back the caller's own row, so the write changes the input
type Row = { n: number };
export function bump(rs: Row[]): number {
  const t = rs.find((r) => r.n > 0);
  if (t) t.n = 0;
  return rs.length;
}

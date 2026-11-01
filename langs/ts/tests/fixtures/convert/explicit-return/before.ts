// explicit-return: a bare return in a unit whose declared result leaves out undefined gets the undefined written in
type Row = { id: string; n: number };

function find(rows: Row[], id: string): Row | null {
  if (rows.length === 0) return;
  for (const r of rows) if (r.id === id) return r;
  return null;
}

export function weightOf(rows: Row[], id: string): number {
  const r = find(rows, id);
  if (r === undefined) return -1;
  return r === null ? 0 : r.n;
}

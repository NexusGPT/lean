// an exported unit: a caller in another module reads the declared result, so it is not widened
export type Row = { id: string };
export function head(rows: Row[]): Row | null {
  if (rows.length === 0) return;
  return rows[0] ?? null;
}

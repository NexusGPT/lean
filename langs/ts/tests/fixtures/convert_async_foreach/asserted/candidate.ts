// pyka src/server/alert-data.ts alertNewData, reduced: the rows of an external database are typed an array only by an
// `as` (pyka's db.ts: `.rows as Rows`), then a synchronous forEach runs after the only await
import { query } from "ext-db";
type Rows = Record<string, unknown>[];
const rowsOf = async (text: string): Promise<Rows> => (await query(text)).rows as Rows;
export async function alertNew(): Promise<string[]> {
  const [best, aisles] = await Promise.all([rowsOf("best"), rowsOf("aisles")]);
  const rows = best.slice(0, 12);
  const targets: string[] = rows.map((r) => String(r["gtin"]));
  for (let i = 0; i < aisles.length; i++) {
    const a = aisles[i];
    if (a === undefined) continue;
    const r = rows[i];
    targets.push(r ? `${String(a["aisle"])}:${String(r["gtin"])}` : String(a["aisle"]));
  }
  return targets;
}

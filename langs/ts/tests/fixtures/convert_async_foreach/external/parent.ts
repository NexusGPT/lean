// pyka src/server/alert-data.ts alertNewData, reduced: two reads of an external database awaited together, then a
// synchronous forEach after the only await; the external's values are lane B's demand-driven fakes
import { query } from "ext-db";
export async function alertNew(): Promise<string[]> {
  const [best, aisles] = await Promise.all([query("best"), query("aisles")]);
  const rows = best.slice(0, 12);
  const targets: string[] = rows.map((r) => String(r["gtin"]));
  aisles.forEach((a, i) => {
    const r = rows[i];
    targets.push(r ? `${String(a["aisle"])}:${String(r["gtin"])}` : String(a["aisle"]));
  });
  return targets;
}

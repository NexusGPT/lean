// pyka src/server/alert-data.ts alertNewData, reduced: two reads awaited together through a module-level memo,
// then a synchronous forEach after the only await
let inflight: Promise<number[]> | null = null;
function load(): Promise<number[]> { if (inflight === null) inflight = Promise.resolve([1, 2, 3]); return inflight; }
function loadB(): Promise<number[]> { return Promise.resolve([10, 20]); }
export async function alertNew(): Promise<number[]> {
  const [best, aisles] = await Promise.all([load(), loadB()]);
  const rows = best.slice(0, 12);
  const targets: number[] = rows.map((r) => r * 2);
  for (let i = 0; i < aisles.length; i++) {
    const a = aisles[i];
    if (a === undefined) continue;
    const r = rows[i];
    targets.push(r !== undefined ? a + r : a);
  }
  return targets;
}

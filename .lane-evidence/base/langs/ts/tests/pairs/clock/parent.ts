import { readClock, save } from "./env";
export function same(): boolean {
  return readClock() === readClock();
}
export function always(): boolean {
  return true;
}
export async function store(id: string, n: number): Promise<number> {
  const before = await readClock();
  await save(id, n + 1);
  const after = await readClock();
  return after - before;
}
export function pureOnly(xs: readonly number[]): number {
  let t = 0;
  for (const x of xs) { if (x > 0) t = t + x; }
  return t;
}

import { importedAsync } from './ports';
export async function namedAsync(n: number): Promise<number> {
  const value = await Promise.resolve(n);
  return await importedAsync(value);
}
export async function spreadRace(n: number): Promise<number> {
  return await Promise.race(...[[n + 1]]);
}
export function untouched(n: number): number { return n + 1; }

export async function innerCatch(n: number): Promise<number> {
  try { return await Promise.resolve(7); }
  catch (e) { return 9; }
}
export async function outerCatch(n: number): Promise<number> {
  try { return await Promise.reject<number>(n).then(x => x + 1); }
  catch (e) { return 8; }
}
type Tagged = { kind: 'number'; value: number } | { kind: 'text'; text: string };
export async function narrowed(value: Tagged): Promise<number> {
  const r = await Promise.resolve(value);
  return r.kind === 'number' ? r.value : r.text.length;
}

export async function rejectCaught(n: number): Promise<number> {
  try { throw n; }
  catch (e) { return 7; }
}

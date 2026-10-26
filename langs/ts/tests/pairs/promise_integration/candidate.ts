import { importedAsync } from './ports';
export async function namedAsync(n: number): Promise<number> {
  const value = await Promise.resolve(n);
  return await importedAsync(value);
}
export async function spreadRace(n: number): Promise<number> {
  return await Promise.race(...[[n + 1]]);
}
export function untouched(n: number): number { return n + 1; }

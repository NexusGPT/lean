import { importedAsync } from './ports';
export async function namedAsync(n: number): Promise<number> {
  return Promise.resolve(n).then(importedAsync);
}
export async function spreadRace(n: number): Promise<number> {
  return await Promise.race(...[[n]]);
}
export function untouched(n: number): number { return n + 1; }

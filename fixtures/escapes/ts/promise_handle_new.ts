// expect: promise
// a promise the unit builds with new Promise is the executor reading of another row, not a handle
export function delay(ms: number): Promise<number> {
  return new Promise((resolve) => resolve(ms));
}

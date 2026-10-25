// expect: promise
export function wrap(x: number): Promise<number> {
  return Promise.resolve(x);
}

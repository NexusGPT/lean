// expect: async-reduce
// reduce with an async callback passes a promise as the accumulator without waiting
export async function total(xs: number[]): Promise<number> {
  return await xs.reduce(async (acc, x) => (await acc) + x, Promise.resolve(0));
}

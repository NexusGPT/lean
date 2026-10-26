// expect: async-predicate
export async function bad(xs: number[]): Promise<number[]> {
  return await Promise.all(xs.filter(async x => x > 0));
}

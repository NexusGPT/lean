// expect: promise-executor
// settlement inside another expression is not a terminal statement
export async function maybe(n: number): Promise<number> {
  return await new Promise<number>((resolve) => {
    n > 0 && resolve(n);
  });
}

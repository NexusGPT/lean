// expect: promise-handler
// a same-file call inside an executor throws, so its fault must be visible in the executor
function check(n: number): number {
  if (n < 0) throw new Error('negative');
  return n;
}

export async function checked(n: number): Promise<number> {
  return await new Promise<number>((resolve) => {
    resolve(check(n));
  });
}

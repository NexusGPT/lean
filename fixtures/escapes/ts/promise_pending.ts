// expect: promise-pending
// a promise bound to a name and never awaited leaves pending work
export async function start(n: number): Promise<number> {
  const p = new Promise<number>((resolve) => {
    resolve(n);
  });
  return 1;
}

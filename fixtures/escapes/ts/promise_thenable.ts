// expect: promise-thenable
// resolving with a value that is not a native promise adopts a thenable
export async function adopt(t: PromiseLike<number>): Promise<number> {
  return await new Promise<number>((resolve) => {
    resolve(t);
  });
}

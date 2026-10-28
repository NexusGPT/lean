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

// a named handler whose value no reading calls with one settled argument: a member of a global (its receiver and its
// optional lib parameters) and a module constant holding a function with an optional parameter; neither has a reading
// as a passed value, so the lint names the refusal and the translator refuses it by the same name
function makeFormat(): (x: number, digits?: number) => string { return (x: number, digits?: number) => x.toFixed(digits ?? 0); }
const format = makeFormat();
export async function absolute(n: number): Promise<number> { return await Promise.resolve(n).then(Math.abs); }
export async function formatted(n: number): Promise<string> { return await Promise.resolve(n).then(format); }

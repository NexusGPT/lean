// expect: async
// an async unit called without await leaves its pending work unobserved
async function load(n: number): Promise<number> {
  return n + 1;
}

export function start(n: number): number {
  load(n);
  return n;
}

let counter = 1;
export async function resolved(n: number): Promise<number | null | undefined> {
  return Promise.resolve<number | null | undefined>(null);
}
export async function widened(n: number | null): Promise<number | null | undefined> {
  return Promise.resolve(n).then((value: number | null | undefined) => value);
}
export async function executor(n: number): Promise<number | null | undefined> {
  return await new Promise<number | null | undefined>(resolve => resolve(null));
}
export async function moduleValue(n: number): Promise<number> {
  counter = counter + n;
  return Promise.resolve(n).then(value => counter + value);
}
export async function missing(n: number): Promise<number | undefined> {
  return Promise.resolve(n).then(value => undefined);
}
export function untouched(n: number): number { return n + 1; }

export async function moduleOrdered(n: number): Promise<number> {
  counter = n;
  const current = counter;
  return Promise.resolve(current).then(value => value + 1);
}

export async function returned(fetch: () => Promise<number | null | undefined>): Promise<number | null | undefined> {
  return Promise.resolve(fetch());
}

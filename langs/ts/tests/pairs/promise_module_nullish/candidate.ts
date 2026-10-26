let counter = 1;
export async function resolved(n: number): Promise<number | null | undefined> {
  return Promise.resolve<number | null | undefined>(undefined);
}
export async function widened(n: number | null): Promise<number | null | undefined> {
  const value = await Promise.resolve(n);
  return value;
}
export async function executor(n: number): Promise<number | null | undefined> {
  return await new Promise<number | null | undefined>(resolve => resolve(undefined));
}
export async function moduleValue(n: number): Promise<number> {
  counter = counter + n;
  const value = await Promise.resolve(n);
  return counter + value;
}
export async function missing(n: number): Promise<number | undefined> {
  const value = await Promise.resolve(n);
  return undefined;
}
export function untouched(n: number): number { return n + 1; }

export async function moduleOrdered(n: number): Promise<number> {
  counter = n;
  const current = counter;
  const value = await Promise.resolve(current);
  return value + 1;
}

export async function returned(fetch: () => Promise<number | null | undefined>): Promise<number | null | undefined> {
  return await fetch();
}

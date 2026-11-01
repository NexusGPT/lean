const Object = globalThis.Object;

export function sign(n: number): string {
  return Object.is(n, -0) ? 'negative zero' : n >= 0 ? 'positive' : 'other';
}

export function count(o: { a?: number; b?: number }): number {
  return Object.keys(o).length;
}

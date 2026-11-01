// The opacity ladder (design/w1c-opaque-calls.md): a call through a computed callee has no exact reading; its statement
// is one opaque step keyed by its text, reading every name it mentions and writing every object in scope.
type Handlers = { [k: string]: (x: number) => number };
type Sinks = { [k: string]: (xs: number[]) => void };

export function outside_call(h: Handlers, k: string, x: number): number {
  const y = x + 1;
  const r = h[k](y);
  return r + 2 * y;
}

export function inside_call(h: Handlers, k: string, x: number): number {
  const y = x + 1;
  const r = h[k](y + 1);
  return r + 2;
}

export function read_call(h: Handlers, k: string, x: number): number {
  const y = x + 2;
  const r = h[k](y);
  return r + 2;
}

export function write_call(h: Sinks, k: string, xs: number[]): number {
  h[k](xs);
  return xs.length;
}

export function planted_call(h: Handlers, k: string, x: number): number {
  const r = h[k](x + 3);
  return r;
}

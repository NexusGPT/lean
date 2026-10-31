// A name a destructuring pattern binds over an input path is that path: a write through it is a write through the input
export type Inner = { v: number };
export type Box = { inner: Inner; items: Inner[]; n: number };
export type Row = { cell: Inner };
export type Table = { rows: Row[]; n: number };

export function zero(b: Box): number {
  const { inner } = b;
  inner.v = 0;
  return b.n;
}

export function head(b: Box): number {
  const [first] = b.items;
  first.v = 0;
  return b.n;
}

export function sweep(b: Table): number {
  for (const { cell } of b.rows) cell.v = 0;
  return b.n;
}

function touch(b: Box): void {
  const { inner } = b;
  inner.v = 0;
}

export function reset(b: Box): number {
  touch(b);
  return b.n;
}

function clear({ inner }: Box): void {
  inner.v = 0;
}

export function wipe(b: Box): number {
  clear(b);
  return b.n;
}

export function peek(b: Box): number {
  const { inner } = b;
  return inner.v + b.n;
}

function poke(b: Box): void {
  const i = b.inner;
  i.v = 0;
}

export function prod(b: Box): number {
  poke(b);
  return b.n;
}

// A name a destructuring pattern binds over an input path is that path: a write through it is a write through the input
export type Inner = { v: number };
export type Box = { inner: Inner; items: Inner[]; n: number };
export type Row = { cell: Inner };
export type Table = { rows: Row[]; n: number };

export function zero(b: Box): number {
  return b.n;
}

export function head(b: Box): number {
  return b.n;
}

export function sweep(b: Table): number {
  return b.n;
}

function touch(b: Box): void {
  const { inner } = b;
  inner.v = 0;
}

export function reset(b: Box): number {
  return b.n;
}

function clear({ inner }: Box): void {
  inner.v = 0;
}

export function wipe(b: Box): number {
  return b.n;
}

export function peek(b: Box): number {
  return b.inner.v + b.n;
}

function poke(b: Box): void {
  const i = b.inner;
  i.v = 0;
}

export function prod(b: Box): number {
  return b.n;
}

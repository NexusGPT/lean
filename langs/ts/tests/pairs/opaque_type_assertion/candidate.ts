// A value whose type nothing checked, handed to the outside as it is (type-assertion graded: common.mjs outsideSlot,
// design/w1g-opaque-handed.md): an `as` is erased at run time, the outside is handed the value itself, and no statement
// of the unit reads it as its declared type
export type Foo = { n: number; tag: string };

// (a) the handed assertion unchanged; a change outside it (the result computed another way)
export function forward(x: unknown, g: (f: Foo) => void, k: number): number {
  g(x as Foo);
  const half = k;
  return half + half;
}

// (b) a change inside the handed slot: another value asserted
export function other(x: unknown, y: unknown, g: (f: Foo) => void): void {
  g(y as Foo);
}

// (c) a planted change inside the handed literal (a boundary constant beside the asserted part)
export function planted(x: unknown, g: (o: { f: Foo; k: number }) => void): void {
  g({ f: x as Foo, k: 2 });
}

// (d) the asserted name bound to another input, a change outside the slot that flows through the value it reads
// (LEAN_BREAK=assertion-read stops the handed conversion reading its value and the pair must go red)
export function rebound(x: unknown, y: unknown, g: (f: Foo) => void): void {
  const v = y;
  g(v as Foo);
}

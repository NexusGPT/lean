// a thrown error is observed by its class and, when the program built it, its message (design: the owner's rule of 29 Oct)
type Box = { a?: { b: number; c: number } };
export function engineOnly(o: Box): number {
  return o.a!.b; // on an absent `a` the engine throws a TypeError whose text quotes the source
}
export function userText(n: number): number {
  if (n < 0) throw new Error('negative');
  return n;
}

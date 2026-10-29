// a thrown error is observed by its class and, when the program built it, its message (design: the owner's rule of 29 Oct)
type Box = { a?: { b: number; c: number } };
export function engineOnly(o: Box): number {
  return o.a!.c; // the same TypeError class, another quoted key: no observed difference on the throw
}
export function userText(n: number): number {
  if (n < 0) throw new Error('below zero');
  return n;
}

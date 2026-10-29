// a thrown error is observed by its class and, when the program built it, its message (owner 29 Oct, row f0d879ac):
// an engine-made message is implementation-defined (ECMA-262) and no outcome; a message the program wrote is program data
export function engineOnly(n: number): number {
  if (n > 0) return n;
  return JSON.parse("[x") as number; // the same SyntaxError class, another engine text: no observed difference
}
export function userText(n: number): number {
  if (n < 0) throw new Error('below zero');
  return n;
}

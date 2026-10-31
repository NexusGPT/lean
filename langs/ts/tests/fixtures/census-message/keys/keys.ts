// a fixed tuple of two element types read by an array method: no one element type holds every position, refused by
// the value reading (heap-stage5.md 17c); the refusal names the tuple's types only in its message
export function keyName(k: [string, number]): number {
  return k.map(String).length;
}

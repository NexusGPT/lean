// expect: collection-iterator
// an iterator held in a name is used up by its first read: the second spread is empty in JavaScript, and the reading
// of m.keys() as the key sequence would give it twice
export function twice(m: Map<string, number>): string[] {
  const it = m.keys();
  return [...it, ...it];
}

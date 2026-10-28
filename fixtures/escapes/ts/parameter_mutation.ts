// expect: alias-mutation
// a const name for an element of a parameter's array is no node a parameter holds by field steps (heap shapes read
// those): a push through it stays refused
export function addTag(user: { tags: string[][] }, t: string): number {
  const tags = user.tags[0];
  tags.push(t);
  return tags.length;
}

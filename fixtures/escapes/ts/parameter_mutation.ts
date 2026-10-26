// expect: alias-mutation
export function addTag(user: { tags: string[] }, t: string): number {
  const tags = user.tags;
  tags.push(t);
  return tags.length;
}

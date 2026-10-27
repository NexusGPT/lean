// expect: alias-mutation
// a same-file function that returns a field of its parameter: the caller's local is another name for the caller's input
type User = { id: string; tags: string[] };
function tagsOf(u: User): string[] {
  return u.tags;
}
export function addTag(user: User, t: string): number {
  const tags = tagsOf(user);
  tags.push(t);
  return user.tags.length;
}

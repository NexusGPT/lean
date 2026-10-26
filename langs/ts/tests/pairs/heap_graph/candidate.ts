// The heap layer, stage 1: identity and sharing are observed by lane B as a graph, not as separate renderings.
type User = { id: string; tags: string[] };

// appends in place through the second name: when `tags` is `user.tags`, the user sees it too, and the old array changes
export function addTag(user: User, tags: string[]): number {
  tags.push('new');
  return user.tags.length;
}

// the same replacement through a local alias of the array
export function aliasRefactor(user: User): number {
  const alias = user.tags;
  const xs = [...alias, 'new'];
  user.tags = xs;
  return xs.length;
}

// returns a copy with the same fields: a different object
export function identity(user: User): User {
  return { id: user.id, tags: user.tags };
}

// reads only
export function countTags(user: User, tags: string[]): number {
  return tags.length + user.tags.length;
}

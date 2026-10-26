// The heap layer, stage 1: identity and sharing are observed by lane B as a graph, not as separate renderings.
type User = { id: string; tags: string[] };

// appends by replacing the array: the old array is left as it was
export function addTag(user: User, tags: string[]): number {
  user.tags = [...user.tags, 'new'];
  return user.tags.length;
}

// a refactor that names the array first and replaces it the same way
export function aliasRefactor(user: User): number {
  user.tags = [...user.tags, 'new'];
  return user.tags.length;
}

// returns the user it was given
export function identity(user: User): User {
  return user;
}

// reads only
export function countTags(user: User, tags: string[]): number {
  return user.tags.length + tags.length;
}

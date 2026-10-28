type User = { id: string; tags: string[]; visits: number };
export function addTag(user: User, t: string): number {
  user.tags.push(t);
  return user.tags.length;
}
export function rename(user: User, name: string): User {
  user.id = name;
  return user;
}
export function visit(user: User): number {
  user.visits += 1;
  return user.visits;
}
export function tagTwice(user: User, t: string): number {
  addTag(user, t);
  return addTag(user, t + "2");
}
export function countOnly(user: User): number {
  const u = { ...user };
  u.visits = 0;
  return user.visits;
}

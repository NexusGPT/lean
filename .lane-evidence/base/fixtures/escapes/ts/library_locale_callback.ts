// expect: unsupported-call
// a locale read inside a sort comparator: the comparator has no defined order of transitions. The same read inside a map,
// filter, find, findIndex, some, every, flatMap or reduce callback runs in index order and is read (pair library_members).
export function ordered(xs: string[]): string[] {
  return [...xs].sort((a, b) => (a.toLocaleLowerCase() < b.toLocaleLowerCase() ? -1 : 1));
}

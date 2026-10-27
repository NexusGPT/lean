// expect: unsupported-call
// a mutator used as a value under a condition runs on some paths only
export function maybeLast(lines: string[], take: boolean): string {
  const rest = [...lines];
  const last = take ? rest.pop() : undefined;
  return `${last ?? ""}${rest.length}`;
}

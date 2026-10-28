// expect: unsupported-call
// toString on a union with an object member calls that object's own method
export function text(x: string | { name: string }): string {
  return x.toString();
}

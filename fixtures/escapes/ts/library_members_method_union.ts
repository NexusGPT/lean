// expect: unsupported-call
// indexOf resolves to the string method or the array method; narrow the union first
export function find(v: string | string[], x: string): number {
  return v.indexOf(x);
}

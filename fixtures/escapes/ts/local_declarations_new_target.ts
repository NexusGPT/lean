// expect: unsupported-syntax
// new.target reads how the function was called (with new or not): outside the subset
export function made(): boolean {
  return new.target !== undefined;
}

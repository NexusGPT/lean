// expect: prototype
// a literal `__proto__` or `constructor` key reaches the prototype chain itself (the prototype object, the constructor
// function), which the bracket rule refuses on every receiver; another Object.prototype name on a dictionary is read
// as a value per name (design/proto-names.md)
export function protoOf(d: Record<string, number>): number {
  return d["__proto__"] ?? 0;
}

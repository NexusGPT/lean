// expect: instanceof-constructor
class Hook { static [Symbol.hasInstance](x: unknown): boolean { return true; } }
export function customTest(x: unknown): boolean { return x instanceof Hook; }

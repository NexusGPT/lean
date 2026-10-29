// instanceof on a value the unit did not make: its static type is a claim about its shape, never about the constructor
// that made it, and the prototype chain is the constructor's (design/conformance-readings.md)
class Base { protected baseBrand = 0; }
class Derived extends Base { private derivedBrand = 0; }
export function isBase(x: Base): boolean { return true; }
export function builtIsBase(n: number): boolean { const b = n > 0 ? new Derived() : new Base(); return true; }

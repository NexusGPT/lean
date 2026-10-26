// expect: instanceof-constructor
export function constructorValue(x: unknown, ctor: new () => object): boolean { return x instanceof ctor; }

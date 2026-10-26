// expect: instanceof-constructor
function constructorFor(): typeof Error { return Error; }
export function dynamicTest(x: unknown): boolean { return x instanceof constructorFor(); }

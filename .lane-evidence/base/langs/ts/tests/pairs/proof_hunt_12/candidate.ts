// must-not-prove units of class 12 (design/proof-hunt.md): each unit differs only through the place the class names;
// lane A must not prove any of them

// class 12: instanceof against a same-file class whose declaration changed (the class is named by its name)
class Base { }
class Child { }
export function isBase(n: number): boolean { const b: object = n > 0 ? new Child() : {}; return b instanceof Base; }

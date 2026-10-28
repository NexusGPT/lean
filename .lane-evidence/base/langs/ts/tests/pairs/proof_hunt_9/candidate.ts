// must-not-prove units of class 9 (design/proof-hunt.md): each unit differs only through the place the class names;
// lane A must not prove any of them

// class 9: a module constant whose initializer calls a same-file function whose body changed
function make(k: number): { x: number } { return { x: k + 2 }; }
const CFG = make(1);
export function cfgX(y: number): number { return CFG.x + y; }

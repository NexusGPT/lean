// must-not-prove units of class 7 (design/proof-hunt.md): each unit differs only through the place the class names;
// lane A must not prove any of them

// class 7: a module constant holding a function value, passed by name as a callback
function makeScale(k: number): (x: number) => number { return (x: number) => x * k; }
const scale = makeScale(2);
export function scaled(xs: number[]): number[] { return xs.map(scale); }

// class 7, called: the module constant's function value called directly
export function applied(x: number): number { return scale(x); }

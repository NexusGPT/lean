// a named promise handler: a unit, a module constant holding a function value (keyed by the code its initializer reaches)
function double(x: number): number { return x * 2; }
function inc(x: number): number { return x + 2; }
function makeScale(k: number): (x: number) => number { return (x: number) => x * k; }
function makeShift(k: number): (x: number) => number { return (x: number) => x + k; }
const scale = makeScale(3);
const shift = makeShift(2);

export async function unitHandler(x: number): Promise<number> { return await Promise.resolve(x).then(double); }
export async function bindingHandler(x: number): Promise<number> { return await Promise.resolve(x).then(scale); }
export async function bindingRefactor(x: number): Promise<number> { const y = x; return await Promise.resolve(y).then(scale); }
export async function changedUnit(x: number): Promise<number> { return await Promise.resolve(x).then(inc); }
export async function changedBinding(x: number): Promise<number> { return await Promise.resolve(x).then(shift); }

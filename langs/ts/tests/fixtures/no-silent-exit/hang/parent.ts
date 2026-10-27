// a module that replaces a shared intrinsic at load: every promise chained through `then` never settles
Promise.prototype.then = function () { return this; };
export async function settle(x: number): Promise<number> { return x + 1; }

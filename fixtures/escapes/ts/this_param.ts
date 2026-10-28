// expect: this-param
// a `this` parameter typed any names no receiver type: the function is no method of a type the reading could key its
// receiver on; declare the receiver type (`this: Ctx`)
export function scaled(this: any, n: number): number { return this.k * n; }

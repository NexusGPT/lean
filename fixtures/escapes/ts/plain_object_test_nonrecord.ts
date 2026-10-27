// expect: prototype
// the plain-object test reads exactly on a record value; on `object` the prototype may be any class's
export function isPlainObject(value: object): boolean { return Object.getPrototypeOf(value) === Object.prototype; }

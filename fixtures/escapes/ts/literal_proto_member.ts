// expect: prototype
// `__proto__:` in a literal sets the prototype: `'toString' in d` is false here, true on `{}`
export function bare(): Record<string, number | null> { return { __proto__: null }; }

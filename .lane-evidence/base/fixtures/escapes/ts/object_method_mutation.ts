// expect: object-method-mutation
export function changed(): number { const obj = { count: 0, read(): number { return this.count; } }; obj.count = 1; return obj.read(); }
export function nested() { const holder = { obj: { n: 0, read() { return this.n; } } }; holder.obj.n++; return holder.obj.read(); }

// expect: object-method-mutation
export function changed(): number { const obj = { count: 0, change(): void { this.count += 1; }, read(): number { return this.count; } }; obj.change(); return obj.read(); }

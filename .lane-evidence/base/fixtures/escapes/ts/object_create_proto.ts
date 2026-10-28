// expect: prototype
export function withProto(p: { k: number }): { k: number } { return Object.create(p); }

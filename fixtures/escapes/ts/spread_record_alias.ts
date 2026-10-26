// expect: record-rest
export function aliasRest(r: { a: number; b: number[] }): number { const { a, ...rest } = r; rest.b.push(1); return r.b.length; }

// expect: record-rest
export function emptyRest(r: { a: number }): object { const { a, ...rest } = r; return rest; }

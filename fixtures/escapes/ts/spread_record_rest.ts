// expect: record-rest
export function unknownRest(r: Record<string, number>): number { const { a, ...rest } = r; return rest.b; }

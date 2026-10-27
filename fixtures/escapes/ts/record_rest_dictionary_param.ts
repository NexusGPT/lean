// expect: record-rest
export function withoutA({ a, ...rest }: Record<string, number[]>): number { return a.length; }

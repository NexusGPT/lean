// expect: record-rest
class Point { constructor(public x: number, public y: number) {} }
export function withoutX({ x, ...rest }: Point): number { return x + rest.y; }

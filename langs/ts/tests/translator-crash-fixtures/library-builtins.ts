type Numbers = Set<number>;
type Lookup = ReadonlyMap<string, number>;
export function setSize(x: Numbers): number { return x.size; }
export function mapSize(x: Lookup): number { return x.size; }
export async function promiseValue(x: Promise<number>): Promise<number> { return await x; }

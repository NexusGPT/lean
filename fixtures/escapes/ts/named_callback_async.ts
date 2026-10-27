// expect: async-callback
// a named async function under Promise.all: its awaits interleave across elements
interface Api { get(x: string): Promise<number>; }
let api: Api | undefined;
async function fetchOne(x: string): Promise<number> { return api ? await api.get(x) : 0; }
export async function fetchAll(xs: string[]): Promise<number[]> {
  return await Promise.all(xs.map(fetchOne));
}

// the zod declarations the pair reads (the shapes of zod 3's own types for these members, narrowed)
declare module 'zod' {
  export interface ZodString { parse(x: unknown): string; min(n: number): ZodString; }
  export const z: { string(): ZodString };
}

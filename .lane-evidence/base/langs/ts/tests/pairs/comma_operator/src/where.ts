// a module of the package reached through the `@/` alias whose top level cannot run in lane B's sandbox (require.resolve)
declare const require: { resolve(spec: string): string };
export const where = require.resolve('./where');
export function label(s: string): string {
  return '[' + s + ']';
}

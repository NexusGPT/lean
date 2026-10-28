// a destructuring pattern with defaults: the default applies when the optional field is absent
export type Opts = { readonly limit?: number; readonly step?: number; readonly strict: boolean };
export function reach(o: Opts): number {
  const { limit = 10, step = 1, strict } = o;
  return strict ? limit : limit + step;
}
export function limitOf(limit: number, strict: boolean): number {
  return reach({ limit, strict }) + reach({ strict: false });
}

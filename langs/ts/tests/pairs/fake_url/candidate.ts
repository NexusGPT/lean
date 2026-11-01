// URL and URLSearchParams are the real classes (exec/fakes/web/url.mjs); a URL object is observed by its href, a
// parameter list by its serialisation, a Headers object by its entries (design/w2c-web-fakes.md).
export function link(base: string, id: number): URL {
  return new URL("items/" + id, "https://example.com/" + base);
}
export function query(term: string, page: number): URLSearchParams {
  const q = new URLSearchParams();
  q.set("query", term);
  q.set("page", String(page));
  return q;
}
export function accept(kind: string): Headers {
  return new Headers({ Accept: kind });
}
// refactor: the same parameters set in another order, read back sorted
export function sorted(term: string, page: number): string {
  const q = new URLSearchParams();
  q.append("page", String(page));
  q.append("q", term);
  q.sort();
  return q.toString();
}
// refactor: the UTF-8 length, through the Encoding standard or through Buffer (a lone surrogate is three bytes in both)
export function bytes(text: string): number {
  return Buffer.byteLength(text, "utf8");
}

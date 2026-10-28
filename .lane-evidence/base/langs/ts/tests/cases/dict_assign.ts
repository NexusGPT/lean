// a local dictionary gains keys by index assignment
export function headersFor(token: string, json: boolean): Record<string, string> {
  let headers: Record<string, string> = {};
  if (token !== "") headers["Authorization"] = "Bearer " + token;
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}
export function hasAuth(token: string): boolean {
  const h = headersFor(token, true);
  return h["Authorization"] !== undefined;
}

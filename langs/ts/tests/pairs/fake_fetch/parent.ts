// The fetch fake (exec/fakes/web/fetch.mjs, design/w2c-web-fakes.md): a request is what the server receives, read
// through the Fetch standard's own classes; a response is a row of a table keyed by (method, url, body).
const BASE = "https://api.example.com";

// a changed URL, built as a URL object: the request's URL differs
export async function users(page: number): Promise<number> {
  const u = new URL("/users", BASE);
  u.searchParams.set("page", String(page));
  const res = await fetch(u);
  return res.ok ? 1 : 0;
}

// a changed method, carried by a Request
export async function remove(id: string): Promise<string> {
  const req = new Request(BASE + "/items/" + encodeURIComponent(id), { method: "DELETE" });
  await fetch(req);
  return "ok";
}

// a dropped header, carried by a Headers object
export async function profile(token: string): Promise<boolean> {
  const headers = new Headers({ Accept: "application/json" });
  headers.set("Authorization", "Bearer " + token);
  const res = await fetch(BASE + "/me", { headers });
  return res.ok;
}

// a response read differently: the boundary of the failure test moves
export async function failed(path: string): Promise<boolean> {
  const res = await fetch(BASE + "/status/" + encodeURIComponent(path));
  return res.status >= 400;
}

// an aborted request: the candidate no longer aborts it
export async function cancelled(path: string): Promise<string> {
  const c = new AbortController();
  c.abort();
  try {
    const res = await fetch(BASE + "/slow/" + encodeURIComponent(path), { signal: c.signal });
    return "status " + res.status;
  } catch (e) {
    return (e as Error).name;
  }
}

// refactor: the same request through a Request object
export async function created(name: string): Promise<number> {
  const res = await fetch(BASE + "/items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
  return res.status;
}

// refactor: the same request made twice is answered by the same row, whichever is read
export async function twice(path: string): Promise<number> {
  const a = await fetch(BASE + "/n/" + encodeURIComponent(path));
  const b = await fetch(BASE + "/n/" + encodeURIComponent(path));
  return a.status;
}

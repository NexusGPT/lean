// localStorage as a record (exec/fakes/web/storage.mjs, design/w2c-web-fakes.md): what the store held before the
// unit ran is drawn per input over the unit's own strings; a write is a request to the world, on the trace.
// the parent reads what it wrote; the candidate reads another key
export function theme(t: string): string | null {
  localStorage.setItem("theme", t);
  return localStorage.getItem("mode");
}
// a missing item and an empty one are told apart
export function language(): string {
  return localStorage.getItem("lang") || "en";
}
// a write to another key
export function save(v: string): void {
  sessionStorage.setItem("drafts", v);
}
// refactor: a named property is an item
export function logout(): boolean {
  delete localStorage.token;
  return !("token" in localStorage);
}
// refactor: a counter kept as text
export function visits(): number {
  const n = Number(localStorage.visits ?? "0") + 1;
  localStorage.visits = n;
  return n;
}

// a unit that asks the world: its outcome rests on what lean's fake answered, so no test restates it by value
export async function fetchJson(url: string): Promise<unknown> {
  const r = await fetch(url);
  return r.json();
}

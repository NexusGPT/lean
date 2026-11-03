// Units of a script whose top level awaits the world (lane w9ab, design/world-calls.md): it asks a server, then polls it
// on a timer, so its body never reaches its end under lean. request is not exported (lean's unit surface reaches it),
// backoff awaits a timer armed by the callback form of setTimeout, chunks awaits a stream. Each candidate changes what
// the unit does after its await.
const base = process.env.API_BASE ?? "https://api.example.com";

async function request(path: string): Promise<number> {
  const res = await fetch(base + path);
  const body = res.status === 204 ? undefined : await res.text();
  return res.ok ? (body ?? "").length : -1;
}

export async function backoff(path: string): Promise<string> {
  const res = await fetch(base + path);
  if (res.ok) return "first";
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return "retried";
}

export async function chunks(path: string): Promise<number> {
  const res = await fetch(base + path);
  let n = 0;
  if (res.body) for await (const chunk of res.body as any) n += 1;
  return n;
}

const created = await request("/session");
for (;;) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if ((await request("/status")) > created) break;
}

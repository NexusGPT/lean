// A script added by a PR (tests/w9ab-world-calls.mjs): it refuses to start when its token is absent, then asks a
// server at its top level and polls it on a timer. Its unit `request` is not exported.
const token = process.env.SERVICE_TOKEN?.trim();
if (!token) {
  throw new Error("Set SERVICE_TOKEN.");
}
const base = (process.env.SERVICE_URL ?? "https://api.example.com").replace(/\/+$/, "");

async function request(path, init = {}) {
  const response = await fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
  const body = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return body?.data;
}

const created = await request("/session", { method: "POST" });
for (;;) {
  const status = await request(`/session/${created?.id}`);
  if (status?.ready) break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

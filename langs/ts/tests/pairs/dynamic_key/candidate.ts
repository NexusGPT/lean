// a dictionary read with a literal key, a computed string key that writes null under a '__proto__' guard, and a declared
// field of a record that also has an index signature
export interface Headers { accept: string; [name: string]: string | undefined }

export function limitOf(d: Record<string, number | undefined>): number {
  return d["limit"] ?? 0;
}

export function pageOf(d: Record<string, number | undefined>): number {
  return d["size"] ?? 1;
}

export function putItem(k: string, n: number): number {
  const out: Record<string, number | null> = {};
  out["base"] = n;
  if (k === "__proto__") return -1;
  out[k] = null;
  return out[k] === null ? 1 : 0;
}

export function putChecked(k: string, n: number): number {
  const out: Record<string, number | null> = {};
  out["base"] = n;
  if (k === "__proto__") return -1;
  out[k] = 0;
  return out[k] === null ? 1 : 0;
}

export function acceptOf(h: Headers): string {
  return h["accept"];
}

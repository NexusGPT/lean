// A property of import.meta that the checkout's lib does not declare (url, dirname): a host-defined world read
// (lint.mjs compiler diagnostics, design/top-blockers.md imports-externals)
export function here(): boolean {
  const u = String(import.meta.url);
  return u.length > 0;
}

export function folder(n: number): number {
  const d = import.meta.dirname;
  return n + 1;
}

export function which(): string {
  return import.meta.url;
}

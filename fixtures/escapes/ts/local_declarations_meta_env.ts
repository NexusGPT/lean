// expect: unsupported-syntax
// import.meta.env is injected at build time, not a fact of the module: read it outside the subset
export function mode(): string {
  return String((import.meta as { env?: { MODE?: string } }).env?.MODE ?? "");
}

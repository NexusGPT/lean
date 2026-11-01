export function defaults(type: string, port?: number): { kind: string; port: number } {
  let out = { kind: type, port: 0 };
  if (type === "port" && port !== undefined && port > 1000) {
    out = { kind: "port", port: port + 1 };
  }
  out.kind = out.kind + "?";
  return out;
}

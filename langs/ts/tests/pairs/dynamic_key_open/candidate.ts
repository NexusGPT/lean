// reads lane A refuses by design: an undeclared key of a record that declares fields and an index signature (dot,
// bracket and in), and a literal key naming an Object.prototype member on a dictionary; lane B draws index entries
export interface Headers { accept?: string; [name: string]: string | undefined }

export function agentOf(h: Headers): string | undefined {
  const copy: Headers = { accept: h.accept };
  return copy["x-agent-id"];
}

export function traceOf(h: Headers): string | undefined {
  const copy: Headers = { accept: h.accept };
  return copy.trace;
}

export function protoText(): string {
  const d: Record<string, number> = {};
  return String(d["valueOf"] ?? 0);
}

export function hasAgent(h: Headers): boolean {
  const copy: Headers = { accept: h.accept };
  return "x-agent-id" in copy;
}

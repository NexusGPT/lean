// Inputs shaped by what the unit reads: a parameter whose type names no fields is drawn with the fields the unit
// reads off it and the literals it compares them against, those values first.

// a stored block: `attrs` is a dictionary, so its keys come from the unit's reads, not from the type
export type Block = { type?: string; attrs?: Record<string, string | boolean>; text?: string };

// the candidate stops dropping a stale block (a dictionary read by literal keys, compared against literals)
export function block(node: Block, tools?: Map<string, string>): string | null {
  switch (node.type) {
    case "paragraph": return node.text ?? "";
    case "collection-mention": {
      const id = node.attrs?.collectionId as string | undefined;
      if (tools && id && tools.has(id)) return `[Knowledge: use ${tools.get(id)}]`;
      if (tools) return null;
      return "%%" + (node.attrs?.name || "") + "%%";
    }
    default: return null;
  }
}

// the candidate changes the compared literal
export function providerCode(name: string): number {
  if (name === "open-ai") return 1;
  if (name === "gemini") return 2;
  return 0;
}

const MAX_REASON_CHARS = 300;

// the candidate turns `<=` into `<`: only a reason of exactly MAX_REASON_CHARS characters separates them
export function truncate(reason: string): string {
  return reason.length < MAX_REASON_CHARS ? reason : reason.slice(0, MAX_REASON_CHARS) + "...";
}

// the candidate rewrites the two branches as one conditional expression: the same comparisons in the same order
export function clampLimit(limit: number): number {
  return limit > 100 ? 100 : limit < 0 ? 0 : limit;
}

// untouched
export function label(kind: string): string {
  return kind === "a" ? "Alpha" : "Other";
}

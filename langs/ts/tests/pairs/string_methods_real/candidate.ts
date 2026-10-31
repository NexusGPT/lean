// the string methods of design/heap-stage5.md section 5 in a real file (a float literal makes every number a real):
// a position or a count is truncated toward zero, a found index is a real; each unit returns the pieces of a split
export interface Doc { title: string; body: string; score: number }

export const HALF = 0.5;

export function cut(d: Doc): string[] {
  return d.title.slice(0, d.score + 1).split(",");
}

export function half(d: Doc): string[] {
  return d.title.slice(0, 1).split(",");
}

export function tagged(d: Doc): string[] {
  return d.body.indexOf("#") >= 0 ? d.body.split("#") : [];
}

export function tail(d: Doc): string[] {
  return d.title.slice(d.title.lastIndexOf("/", d.title.length + 1) + 1).split(".");
}

export function padded(d: Doc): string[] {
  return d.title.padStart(4, "0").split("0");
}

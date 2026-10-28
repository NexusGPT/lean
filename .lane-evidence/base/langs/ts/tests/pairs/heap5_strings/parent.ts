// stage 5 step 5: the string methods read exactly, each a pure function of the receiver and its arguments, through
// the ordinary lane's helpers; split of a literal separator allocates a fresh array of the pieces
export interface Doc { title: string; body: string }

export function slug(d: Doc): string {
  return d.title.toLowerCase().replaceAll(" ", "-");
}

export function words(d: Doc): number {
  return d.body.split(" ").length;
}

export function isDraft(d: Doc): boolean {
  return d.title.startsWith("Draft");
}

export function short(d: Doc): string {
  return d.title.length > 10 ? d.title.substring(0, 10) : d.title;
}

export function hasTag(d: Doc): boolean {
  return d.body.includes("#");
}

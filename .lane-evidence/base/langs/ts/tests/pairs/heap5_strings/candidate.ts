// stage 5 step 5: the string methods read exactly, each a pure function of the receiver and its arguments, through
// the ordinary lane's helpers; split of a literal separator allocates a fresh array of the pieces
export interface Doc { title: string; body: string }

export function slug(d: Doc): string {
  return d.title.toLowerCase().replaceAll(" ", "_");
}

export function words(d: Doc): number {
  return d.body.split(" ").length;
}

export function isDraft(d: Doc): boolean {
  return d.title.slice(0, 5) === "Draft";
}

export function short(d: Doc): string {
  return d.title.slice(0, 10);
}

export function hasTag(d: Doc): boolean {
  return d.body.indexOf("#") >= 0;
}

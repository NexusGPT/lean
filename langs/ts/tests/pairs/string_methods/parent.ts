// the string methods of design/heap-stage5.md section 5 that the heap core still refused at its first reading, each
// in a unit that returns or writes the pieces of a split (a fresh array the value reading's identity guard cannot read)
export interface Doc { title: string; body: string; tags: string[] }

export function stem(d: Doc): string[] {
  return d.title.slice(0, d.title.lastIndexOf(".")).split("/");
}

export function ext(d: Doc): string[] {
  return d.title.slice(d.title.lastIndexOf(".")).split(".");
}

export function rule(d: Doc): string[] {
  return d.title.repeat(2).split(",");
}

export function head(d: Doc): string[] {
  return d.body.split(",", 2);
}

export function line(d: Doc): string[] {
  return d.title.concat(",", d.body).split(",");
}

export function retag(d: Doc): void {
  d.tags = d.body.split(" ", 1);
}

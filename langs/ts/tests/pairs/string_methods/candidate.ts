// the string methods of design/heap-stage5.md section 5 that the heap core still refused at its first reading, each
// in a unit that returns or writes the pieces of a split (a fresh array the value reading's identity guard cannot read)
export interface Doc { title: string; body: string; tags: string[] }

export function stem(d: Doc): string[] {
  return d.title.slice(0, d.title.lastIndexOf(".") + 1).split("/");
}

export function ext(d: Doc): string[] {
  return d.title.slice(d.title.lastIndexOf(".", d.title.length + 1)).split(".");
}

export function rule(d: Doc): string[] {
  const twice = d.title.repeat(2);
  return twice.split(",");
}

export function head(d: Doc): string[] {
  return d.body.split(",").slice(0, 2);
}

export function line(d: Doc): string[] {
  return (d.title + "," + d.body).split(",");
}

export function retag(d: Doc): void {
  const words = d.body.split(" ");
  d.tags = words.slice(0, 1);
}

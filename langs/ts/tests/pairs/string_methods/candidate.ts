// the string methods of design/heap-stage5.md section 5 that the heap core still refused at its first reading, each
// in a unit that writes or returns a fresh array (the heap core's reading; the value reading's guard withholds them)
export interface Doc { title: string; body: string; tags: string[]; marks: number[] }

export function stem(d: Doc): void {
  d.tags = [d.title.slice(0, d.title.lastIndexOf(".") + 1)];
}

export function ext(d: Doc): void {
  d.marks = [d.title.lastIndexOf(".", d.title.length)];
}

export function rule(d: Doc): void {
  d.tags = ["---" + d.title];
}

export function head(d: Doc): string[] {
  return d.body.split(",").slice(0, 2);
}

export function line(d: Doc): void {
  d.tags = [d.title + ": " + d.body];
}

export function retag(d: Doc): void {
  const words = d.body.split(" ");
  d.tags = words.slice(0, 1);
}

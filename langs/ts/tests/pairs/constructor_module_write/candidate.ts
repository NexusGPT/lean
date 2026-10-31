// a constructor that writes module state (heap-stage5.md section 21, lane B): the write outlives the call, so it is
// part of what one construction shows, as a write through an argument is
const registry: Record<string, number> = {};
let issued = 0;

export class Entry {
  size: number;
  constructor(public name: string, size: number) {
    this.size = size;
    registry[name] = size + 1;
  }
}

export class Ticket {
  id: number;
  constructor(public owner: string) {
    this.id = issued;
  }
}

export class Label {
  text: string;
  constructor(text: string) {
    this.text = text;
    registry[text] = text.length;
  }
}

export function enrol(name: string, size: number): number {
  registry[name] = size + 1;
  return size;
}

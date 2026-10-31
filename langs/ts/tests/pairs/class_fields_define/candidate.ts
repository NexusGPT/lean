// the class-field emit mode (heap-stage5.md section 21, 2026-10-31): this pair's project targets ES2022, so TypeScript
// defines every declared field before the constructor's body runs (useDefineForClassFields); an optional field nobody
// stores is the key holding undefined, never a missing key
export class Note {
  text: string;
  tag?: string;
  constructor(text: string) {
    this.text = text;
  }
}

export function made(t: string): Note {
  const n = new Note(t);
  n.tag = undefined;
  return n;
}

export function blank(t: string): Note {
  const n = new Note(t);
  n.tag = "";
  return n;
}

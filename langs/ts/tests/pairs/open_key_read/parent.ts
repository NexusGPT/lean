const NAMES = { 0: "zero", 1: "one", 2: "two" };

interface Row {
  id: number;
  name: string;
  label: string;
}

interface Media {
  MediaUrl0: string;
  MediaUrl1: string;
}

// a number key on a record of numeric names: the candidate reads the next key
export function numberName(n: number): boolean {
  return NAMES[n] === "one";
}

// a string key on a row parameter, read once and tested
export function isText(row: Row, key: string): boolean {
  const v = row[key];
  return typeof v === "string";
}

// a template key on a record parameter
export function hasMedia(p: Media, i: number): boolean {
  return p[`MediaUrl${i}`] !== undefined;
}

// an opaque value defaulted by ??: the candidate's default differs, seen only when the value is null or undefined
export function orDefault(x: any): boolean {
  return (x ?? "A") === "A";
}

// an optional read on an opaque value: the candidate drops the ?., which throws on null or undefined
export function lengthOf(x: any): number {
  return x?.length;
}

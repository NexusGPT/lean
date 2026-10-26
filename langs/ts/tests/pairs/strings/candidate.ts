declare const console: { log(message: string): void };

export function slug(s: string): string {
  return s.trim().toLowerCase().split("_").join("-");
}

export function padded(s: string): string {
  let out = s;
  for (let i = s.length; i < 1; i++) {
    out = "0" + out;
  }
  return out;
}

export function maximum(a: string, b: string): string {
  return a > b ? b : a;
}

export function untouched(s: string, b: boolean): string {
  return `${s}:${b}:${42}`;
}

export function unicodeCase(s: string): string {
  return s;
}

export function splitLimit(s: string): string[] {
  return s.split(",");
}

export function substitution(s: string): string {
  return s.replaceAll("a", "$1");
}

export function unicodeLiteral(): string {
  return "É";
}

export function searchTerm(): string {
  console.log("search");
  return "a";
}

export function searchPosition(): number {
  console.log("position");
  return 1;
}

export function argumentOrder(s: string): boolean {
  const term = searchTerm();
  const position = searchPosition();
  return s.includes(term, position);
}

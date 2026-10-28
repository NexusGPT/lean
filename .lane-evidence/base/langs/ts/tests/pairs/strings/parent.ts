declare const console: { log(message: string): void };

export function slug(s: string): string {
  return s.trim().toLowerCase().split(" ").join("-");
}

export function padded(s: string): string {
  return s.padStart(1, "0");
}

export function maximum(a: string, b: string): string {
  return a < b ? b : a;
}

export function untouched(s: string, b: boolean): string {
  return `${s}:${b}:${42}`;
}

export function unicodeCase(s: string): string {
  return s.toUpperCase();
}

export function splitLimit(s: string): string[] {
  return s.split(",", 1);
}

export function substitution(s: string): string {
  return s.replaceAll("a", "$&");
}

export function unicodeLiteral(): string {
  return "É".toLowerCase();
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
  return s.includes(searchTerm(), searchPosition());
}

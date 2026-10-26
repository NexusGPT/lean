export function fraction(s: string): string { return s.padEnd(3.9, "ab"); }
export function negative(s: string): string { return s.charAt(-0.5); }
export function pos(s: string): number { return s.lastIndexOf("a", 1.9); }
export function words(xs: number[]): string { return xs.join(","); }
export function decimal(): string { return `${1e21}:${0.1}:${-0.0}`; }

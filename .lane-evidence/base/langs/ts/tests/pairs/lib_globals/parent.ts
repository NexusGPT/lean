/// <reference lib="dom" />
// lib globals: a name the lib declares is a world read; a call to it is a transition

export function byteWidth(n: number): number {
  return Uint8Array.BYTES_PER_ELEMENT * n;
}

export function encodeName(prefix: string, s: string): string {
  return escape(prefix + s);
}

export function language(): string {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language;
}

export function guardedLanguage(): string {
  return typeof navigator !== 'undefined' ? navigator.language : 'en';
}

export function visit(tag: string): string {
  const here = location.href;
  console.log(tag);
  return here;
}

export function languageCount(): number {
  return navigator.languages.length;
}

export function untouched(x: number): number {
  return x + 1;
}

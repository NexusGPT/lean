/// <reference lib="dom" />
// lib globals: a name the lib declares is a world read; a call to it is a transition

export function byteWidth(n: number): number {
  return Int16Array.BYTES_PER_ELEMENT * n;
}

export function encodeName(prefix: string, s: string): string {
  const whole = prefix + s;
  return escape(whole);
}

export function language(): string {
  return typeof navigator === 'undefined' ? 'en' : navigator.language;
}

export function guardedLanguage(): string {
  return navigator.language;
}

export function visit(tag: string): string {
  console.log(tag);
  const here = location.href;
  return here;
}

export function languageCount(): number {
  return navigator.languages.length;
}

export function untouched(x: number): number {
  return x + 1;
}

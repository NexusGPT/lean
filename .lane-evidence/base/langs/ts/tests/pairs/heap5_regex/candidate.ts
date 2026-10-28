// stage 5 step 6: a regular expression literal in a call is a bodiless function of its text and the operands
export interface Line { text: string; code: string }

export function isCode(l: Line): boolean {
  return /^[A-Z]{2}$/.test(l.code);
}

export function squash(l: Line): string {
  return l.text.replaceAll(/\s+/g, " ");
}

export function parts(l: Line): number {
  return l.text.split(/,\s*/).length;
}

export function clean(l: Line): string {
  return l.text.replace(/-/g, "");
}

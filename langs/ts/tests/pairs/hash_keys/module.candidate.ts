// the opaque module identity covers the code a unit reaches, not the whole file
const TAG = /#(\w+)/i;
const MENTION = /@(\w+)/i;
const CODE = /\$(\w*)/i;

export function hasTag(text: string): boolean {
  return TAG.test(text);
}

export function hasMention(text: string): boolean {
  return MENTION.test(normalize(text));
}

export function hasCode(text: string): boolean {
  return CODE.test(text);
}

function normalize(text: string): string {
  return text.trim() + " @all";
}

/**
 * Upper-cases a note and marks it.
 */
export function shout(text: string): string {
  return text.toUpperCase() + "!";
}

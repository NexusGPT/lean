// a brace inside a string literal, a template literal with a hole, and a comment is text, never structure
export function inString(reply: string): string {
  return reply.startsWith("{") ? "json" : "text";
}

export function inTemplate(name: string): string {
  return `{${name}} opened with a brace {`;
}

export function inComment(reply: string): string {
  // an open brace { in a comment, and a close brace } too
  return reply.startsWith("[") ? "list" : "text"; /* { */
}

export function changedString(reply: string): string {
  return reply.startsWith("{") ? "json" : "text";
}

export function changedTemplate(name: string): string {
  return `{${name}} closed`;
}

export function changedComment(reply: string): string {
  // a brace { in a comment
  return reply.startsWith("[") ? "list" : "text";
}

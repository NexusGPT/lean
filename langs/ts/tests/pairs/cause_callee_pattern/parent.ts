// A unit that hands a string to a parser in another file of its package. Lane B draws strings from its edges, the
// unit's literals and the patterns of the unit's own file; a parser's pattern in another file was never sampled, so a
// drawn string never parsed and the branch that uses the parsed key never ran (exec/spec.mjs, design/callee-pattern.md).
import { keyOfToken, type AttemptKey } from "./token";

export interface Build { vars?: { name: string; value?: string }[] }

// the candidate swaps the test on the absent token
export function attemptKeyOf(build: Build): AttemptKey | null {
  const token = build.vars?.find((v) => v.name === "ATTEMPT")?.value;
  return token === undefined ? null : keyOfToken(token);
}

// the same test written as an if: equal
export function attemptKeyOfRefactor(build: Build): AttemptKey | null {
  const token = build.vars?.find((v) => v.name === "ATTEMPT")?.value;
  return token === undefined ? null : keyOfToken(token);
}

// untouched
export function hasAttempt(build: Build): boolean {
  return (build.vars ?? []).some((v) => v.name === "ATTEMPT");
}

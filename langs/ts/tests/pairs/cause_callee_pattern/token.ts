// The parser the units hand their token to: a token is the attempt's id and its number, or it is not a token.
const TOKEN_PATTERN = /^attempt-([0-9a-f]{6}):([1-9][0-9]*)$/;

export interface AttemptKey { id: string; attempt: number }

export function keyOfToken(token: string): AttemptKey | null {
  const match = TOKEN_PATTERN.exec(token);
  if (match === null || match[1] === undefined || match[2] === undefined) return null;
  return { id: match[1], attempt: Number(match[2]) };
}

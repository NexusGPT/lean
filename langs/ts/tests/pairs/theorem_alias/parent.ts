// two units whose Dafny bodies are the same text: inside the model (an owned key) they agree, outside it (a missing key,
// which JavaScript reads as undefined) they do not, so the in-range obligation stays on the aliased lemma
export function truth(m: Record<string, number>, k: string): number {
  return m[k] ? 1 : 0;
}

export function letTruth(m: Record<string, number>, k: string): number {
  let v = m[k];
  return v ? 1 : 0;
}

// untouched: the same source on both sides, aliased and proved
export function same(m: Record<string, number>, k: string): number {
  return m[k] ? 1 : 0;
}

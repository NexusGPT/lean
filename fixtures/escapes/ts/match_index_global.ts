// expect: unsupported-member
// the index of a match of a global regular expression depends on lastIndex, state the regular expression carries
// between calls; only a literal without the g and y flags reads `m.index` as a function of the pattern and the string
export function where(raw: string): number {
  const m = /b/g.exec(raw);
  return m ? m.index : -1;
}

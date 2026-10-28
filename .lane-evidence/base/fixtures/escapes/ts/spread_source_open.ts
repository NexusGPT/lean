// expect: spread-source
// A record spread after an arrow-valued member, on an open record (an index signature): the spread may overwrite the
// function with a key the type does not name, and the reading holds no function slot to compare; refused by name.
export interface Open { a: number; [k: string]: unknown }
export function withHandler(s: Open) {
  return { onClick: () => 0, ...s };
}

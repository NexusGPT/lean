// expect: spread-source
// a record literal carries one spread with its rest (design/open-datatype.md); a member before it survives only where
// the source lacks its key, and an optional field may be missing or hold undefined, which the value reading tells
// apart nowhere; a second spread keeps the keys of the first source the second lacks
export interface Opt { a?: number; b: string }
export interface Rec { a: number; b: string }
export function late(s: Opt): Opt { return { a: 1, ...s }; }
export function merged(x: Rec, y: Rec): Rec { return { ...x, ...y }; }

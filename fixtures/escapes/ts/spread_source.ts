// expect: spread-source
// A record spread written after a method member: the spread may overwrite the method with a source key, and the reading
// holds no method slot to compare (design/open-datatype.md, spreadReadWhy). A plain copy `Object.assign({}, s)` and a
// later spread are read since 28 Oct (the source itself with its rest; an uninterpreted merge); this form stays refused.
export interface Rec { a: number; b: string }
export function withMethod(s: Rec) {
  return { show() { return 1; }, ...s };
}

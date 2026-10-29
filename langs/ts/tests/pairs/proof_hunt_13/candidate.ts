// must-not-prove units of class 13 (design/proof-hunt.md): a spread or Object.assign of a record-typed value copies
// every own key the value holds at run time, which a datatype of the declared fields does not hold; lane A must not
// prove any of them against the declared fields written one by one
export function spreadCopy(a: { x: number }): { x: number } { return { x: a.x }; }
export function assignNew(a: { x: number }, b: { y: number }): { x: number; y: number } { return { x: a.x, y: b.y }; }

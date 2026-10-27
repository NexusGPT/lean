// expect: loose-equality
// == against a literal on a primitive-or-record union goes through the coercion table (a record's toString or valueOf
// runs); only === is read, true on the literal's primitive arm alone
type Opts = { limit: number };
export function auto(x: string | Opts): boolean { return x == "auto"; }

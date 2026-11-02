// expect: ts-strict
// A member of a type whose base does not resolve is unknown: a read of it is the accessor of the opaque value
// (tests/pairs/opaque_ts_strict), but a write needs the field declared, so a unit that writes through it keeps the
// compiler's error (w1e, design/w1e-opaque-this-globals.md; library-rows.mjs writesThroughIncomplete).
import { Client } from 'generated-client-not-installed';

class Db extends Client {}

export function rename(db: Db, name: string): string {
  db.pack.name = name;
  return db.pack.name;
}

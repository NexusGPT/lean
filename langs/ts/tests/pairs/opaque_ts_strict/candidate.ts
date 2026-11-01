// A class whose base comes from a module the checkout does not resolve (the generated client is not there) has members
// the checker cannot list: a member it does not find is unknown, not absent (TS2339 on a type whose declaration reaches
// the error type). A read of it is the accessor of the opaque value, the reading the member check already gives such a
// type (library-rows.mjs incompleteType); before, the lint refused it ts-strict (w1e, design/w1e-opaque-this-globals.md).
// A write through it stays refused (fixtures/escapes/ts/incomplete_base_write.ts).
import { Client } from 'generated-client-not-installed';

class Db extends Client {}

export class Packs {
  constructor(private readonly db: Db) {}

  // (a) the member read is unchanged; the candidate inlines the local around it
  empty(id: string): boolean {
    return this.db.pack.count(id) === 0;
  }

  // (b) the candidate reads another member of the opaque value
  owner(id: string): boolean {
    return this.db.packs.owner(id) === "me";
  }

  // (c) the candidate is mutate.mjs's planted change inside the read's call (a string literal)
  label(id: string): boolean {
    return this.db.pack.label("pack:x" + id) === "";
  }
}

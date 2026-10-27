// expect: unresolved-module migration
// expect-none: any-type
import { Client, connect } from "./no-such-module";
export function ping(client: Client): number {
  const conn = connect(client);
  return conn.ok ? 1 : 0;
}

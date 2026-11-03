// a Node builtin, read without Node's declarations (no install)
import { isIP } from 'node:net';

export class Host {
  kind(name: string): number { return isIP(name); }
}

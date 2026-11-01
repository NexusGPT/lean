// lane B's behavioural crypto (exec/fakes/crypto.mjs): random draws from the seeded generator, digests Node's own
import { createHash, randomUUID } from 'node:crypto';

// changed behaviour: the candidate expects a SHA-1 hex length from a SHA-256 digest
export function fingerprint(text: string): string {
  const hex = createHash('sha256').update(text).digest('hex');
  return hex.length === 64 ? hex.slice(0, 12) : '';
}

// changed behaviour: the candidate counts four groups in a UUID
export function newId(prefix: string): string {
  const id = randomUUID();
  return id.split('-').length === 5 ? `${prefix}-${id}` : prefix;
}

// refactor: the hash object held in a local, updated, then digested (Node's Hash, no request to the world)
export function digest(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// units that hand out a function or call a callback AND ask the world (design/w9as-merge.md): the test calls what they
// hand out under the stubs of lean's answers, and the callback's spy answers beside them
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// a handed-out function whose every call reads a file: each drive's read is a stub's answer, in lean's order
export function loader(dir: string): (name: string) => string {
  return (name: string) => readFileSync(join(dir, name), 'utf8');
}
// the call reads the clock, the handed-out function only what the call kept: the stub answers the call, the drives are closed
export function since(label: string): () => string {
  const at = Date.now();
  return () => `${label}@${at}`;
}
// a callback called beside a request of the world: the spy answers its calls, the stub the clock
export function tagAll(items: string[], f: (s: string) => string): string[] {
  const at = Date.now();
  return items.map((s) => `${f(s)}@${at}`);
}

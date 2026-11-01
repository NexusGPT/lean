// lane B's behavioural fs (exec/fakes/fs.mjs): an in-memory tree; what the unit writes it reads back, a file it never
// touched is drawn once (absent, or present with one of its own strings), and errors carry Node's codes
import fs from 'node:fs';
import * as path from 'node:path';

// changed behaviour: the candidate reads another field of what it wrote
export function cachedCount(dir: string, n: number): number {
  const file = path.join(dir, 'cache.json');
  fs.writeFileSync(file, JSON.stringify({ count: n, total: n + 1 }));
  return JSON.parse(fs.readFileSync(file, 'utf8')).count;
}

// changed behaviour: the candidate tests for a code fs never raises for a missing file
export function readOrEmpty(file: string): string {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (e: any) {
    if (e.code === 'ENOENT') return '';
    throw e;
  }
}

// changed behaviour, promise form: the candidate reads another field of what it wrote
export async function savedName(file: string, name: string): Promise<boolean> {
  await fs.promises.writeFile(file, JSON.stringify({ name }));
  const raw = await fs.promises.readFile(file, 'utf8');
  return JSON.parse(raw).name === name;
}

// refactor: the read bound to a local first
export function lineCount(file: string): number {
  const text = fs.readFileSync(file, 'utf8');
  return text.split('\n').length;
}

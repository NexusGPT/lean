// lane B's behavioural path (exec/fakes/path.mjs): Node's own pure functions, POSIX, the working directory /app
import path from 'node:path';

// changed behaviour: the candidate compares the base name without its extension
export function isIndex(file: string): boolean {
  return path.basename(file) === 'index.ts';
}

// changed behaviour: the candidate expects the Windows separator between the parts path.join joins
export function joinedPlainly(dir: string, name: string): boolean {
  return path.join(dir, name) === `${dir}/${name}`;
}

// refactor: a list membership for two comparisons
export function isScript(file: string): boolean {
  const ext = path.extname(file);
  return ext === '.ts' || ext === '.tsx';
}

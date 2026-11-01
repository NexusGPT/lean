// the path rows (translate/library.json, receiver "module"; design/w2b-node-fakes.md): path.join on strings is a pure
// function in lane A and a computed operation in lane B, so a refactor that calls it a different number of times, or
// moves it across a request, proves; reordered arguments do not
import path from 'node:path';
export interface Log { info(text: string): void }

// refactor: the joined path bound to a local first
export function outPath(dir: string, name: string): string {
  return path.join(dir, name);
}

// refactor: one join instead of two
export function sameTwice(dir: string, name: string): boolean {
  const a: string = path.join(dir, name);
  return a === a;
}

// refactor: the join moved after the log request
export function joinThenLog(log: Log, dir: string, name: string): string {
  log.info('joined');
  return path.join(dir, name);
}

// changed behaviour: the parts in the other order
export function reordered(dir: string, name: string): string {
  const file: string = path.join(name, dir);
  return file;
}

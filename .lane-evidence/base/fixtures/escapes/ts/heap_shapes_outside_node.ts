// expect: alias-mutation
// heap shapes: a write through a node that came from the outside and is no parameter's node (a module registry) stays
// refused. The heap core reads writes through a node a parameter holds; a module object is a shared heap object the
// unit was not handed, so a const name for its array is another name for a value outside the unit.
export interface Registry { names: string[]; seen: Record<string, string> }
const REGISTRY: Registry = { names: [], seen: {} };

export function forget(name: string): void {
  const names = REGISTRY.names;
  names.splice(names.indexOf(name) >>> 0, 1);
}

export function stamp(token: string): void {
  Object.assign(REGISTRY, { names: [token] });
}

export function note(k: string): void {
  REGISTRY.seen[k] = "1";
}

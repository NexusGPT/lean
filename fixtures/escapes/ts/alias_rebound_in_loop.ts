// expect: alias-mutation
// the fresh array is made before the loop, and the loop binds the name back to the handed array: a later step pushes
// into the caller's array
export function mixed(merged: number[], steps: number[]): number {
  let flat = merged;
  flat = [];
  for (const s of steps) {
    flat.push(s);
    flat = merged;
  }
  return flat.length;
}

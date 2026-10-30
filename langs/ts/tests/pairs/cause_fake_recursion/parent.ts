// A visitor that recurses through a tree the world holds (the `ts.forEachChild(node, visit)` shape). Lane B hands the
// imported walker a fake, which runs each callback it is given once with a fake node; the visitor calls the walker
// again from inside, so the recursion goes on as deep as the fake tree goes (exec/fake.mjs, design/fake-recursion.md).
import * as walker from "tree-walk";

const MARKERS = new Set(["emit", "print"]);

function writesItself(root: unknown): boolean {
  let found = false;
  const visit = (node: unknown): void => {
    if (found) return;
    if (walker.isCall(node) && MARKERS.has(walker.nameOf(node))) {
      found = true;
      return;
    }
    walker.forEachChild(node, visit);
  };
  visit(root);
  return found;
}

// the candidate negates the test on the visitor's answer
export function reaches(seed: readonly string[], root: unknown): boolean {
  if (writesItself(root)) return true;
  return seed.length > 2;
}

// the candidate renames the locals: equal
export function reachesRenamed(seed: readonly string[], root: unknown): boolean {
  if (writesItself(root)) return true;
  const n = seed.length;
  return n > 2;
}

// untouched
export function countSeed(seed: readonly string[]): number {
  return seed.length;
}

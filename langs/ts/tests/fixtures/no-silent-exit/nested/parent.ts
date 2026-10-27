// records nested deeper than the heap enumerator's depth: past it a field is drawn by the generator, not a pool slot
type Inner = { value: string };
type Leaf = { inner: Inner };
type L5 = { leaf: Leaf };
type L4 = { l5: L5 };
type L3 = { l4: L4 };
type L2 = { l3: L3 };
type L1 = { l2: L2 };
type Root = { first: L1; second: L1 };
export const firstIsSet = (root: Root): boolean => root.first !== undefined;

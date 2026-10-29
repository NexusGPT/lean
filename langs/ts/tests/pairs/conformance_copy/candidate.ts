// a copy carries every own key of its source, the keys its type does not name included (design/conformance-readings.md)
export type Pt = { x: number; y: number };
export function cloned(p: Pt): Pt { return { x: p.x, y: p.y }; }
export function bothCloned(p: Pt): Pt { return structuredClone(p); }
export function clonedAlias(p: Pt): Pt { return p; }

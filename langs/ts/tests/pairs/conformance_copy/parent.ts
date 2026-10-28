// a copy carries every own key of its source, the keys its type does not name included (design/conformance-readings.md)
export type Pt = { x: number; y: number };
export function cloned(p: Pt): Pt { return structuredClone(p); }
export function bothCloned(p: Pt): Pt { const q = structuredClone(p); return q; }
export function clonedAlias(p: Pt): Pt { return structuredClone(p); }

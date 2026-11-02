// callees that write none of their arguments; remember keeps what it is handed, touchKept writes what remember kept
let kept: { tags: string[] } | null = null;
export function remember(v: { tags: string[] }): number { kept = v; return v.tags.length; }
export function isSmall(n: number): boolean { return n < 100; }
export function touchKept(n: number): boolean { if (kept) kept.tags.length = 0; return n < 100; }

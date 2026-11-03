export function fin(v: unknown): boolean { return typeof v !== "object" && isFinite(v as number); }

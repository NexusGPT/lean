export function fin(v: unknown): boolean { return typeof v !== "object" && Number.isFinite(v as number); }

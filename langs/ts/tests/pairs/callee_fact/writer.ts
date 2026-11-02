// the planted writer: a guard that also clears the tags of what it is handed
export function isTagged(value: unknown): boolean {
  if (typeof value === "object" && value !== null && Array.isArray((value as { tags?: unknown }).tags)) {
    (value as { tags: string[] }).tags.length = 0;
    return true;
  }
  return false;
}

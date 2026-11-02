// the entry of a key at a stage, in a cache the caller holds: built, named and added only when the stage has none yet
function entryOf(cache: any, stage: string, key: string, name: string | null): any {
  const data = cache.getData(key);
  const slot = data[stage];
  if (slot.entry === undefined) {
    slot.entry = { key, name: name || 'anonymous' };
    cache.add(slot.entry);
  }
  return slot.entry;
}

export function register(cache: any, type: string, stage: string, key: string, name: string | null = null): void {
  entryOf(cache, stage, key, type === 'buffer' ? null : name);
}

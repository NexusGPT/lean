export function openStore(dir: string | undefined, log: string[]): string {
  log.push("open");
  const file = dir!.trim() + "/store.db";
  return file;
}

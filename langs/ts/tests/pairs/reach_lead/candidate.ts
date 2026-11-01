export function openStore(dir: string | undefined, log: string[]): string {
  log.push("open " + (dir ?? "default"));
  const file = dir!.trim() + "/state.db";
  return file;
}

// A unit no parent holds, run through exec/new-unit.mjs in its own child (design/sandbox-boundary.md). It leaves the vm
// context through a host intrinsic (Buffer's constructor is the child's Function) and tries every door the lane B
// worker refuses: a file write, a child process, a read outside the trees it is given, and an environment variable
// outside lean's own reads (names only). It throws naming every door that opened, so a fault is an open door.
const host = (): any => (Buffer as any).constructor('return process')();
const KEPT = /^(?:LEAN_\w*|NODE_OPTIONS|PATH|HOME|XDG_CACHE_HOME)$/;

export function escapes(): string {
  const mod = (name: string): any => host().getBuiltinModule(name);
  const open: string[] = [];
  try { const f = mod('os').tmpdir() + '/lean-new-unit-escape.txt'; mod('fs').writeFileSync(f, 'escape'); mod('fs').unlinkSync(f); open.push('write'); } catch { /* refused */ }
  try { const r = mod('child_process').spawnSync('true'); if (!r.error) open.push('spawn'); } catch { /* refused */ }
  try { mod('fs').readdirSync('/'); open.push('read /'); } catch { /* refused */ }
  const leaked = Object.keys(host().env).filter((k) => !KEPT.test(k));
  if (leaked.length) open.push(`env ${leaked.length}`);
  if (open.length) throw new Error(`open: ${open.join(', ')}`);
  return 'closed';
}

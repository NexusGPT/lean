// A probe of the lane that observes a unit with no parent (exec/new-unit.mjs): it reaches the process through Buffer's
// constructor, attempts a file write and a child process, and throws what happened, so the run's fault examples show it.
const host = (): any => (Buffer as any).constructor('return process')();
const outcome = (e: any): string => `${e && e.code ? e.code : 'error'}: ${String(e && e.message).split('\n')[0]}`;

export function newUnitReach(): string {
  const mod = (name: string): any => host().getBuiltinModule(name);
  const out: string[] = [];
  try { const f = mod('os').tmpdir() + '/lean-sandbox-new-unit-probe.txt'; mod('fs').writeFileSync(f, 'probe'); mod('fs').unlinkSync(f); out.push('write ok'); } catch (e) { out.push(`write ${outcome(e)}`); }
  try { const r = mod('child_process').spawnSync('true'); out.push(r.error ? `spawn ${outcome(r.error)}` : `spawn ok (exit ${r.status})`); } catch (e) { out.push(`spawn ${outcome(e)}`); }
  throw new Error(out.join('; '));
}

export async function newUnitNet(): Promise<string> {
  const r = await new Promise<string>((resolve) => {
    const s = host().getBuiltinModule('net').connect({ host: '127.0.0.1', port: 47391 });
    s.on('connect', () => { s.destroy(); resolve('connect ok'); });
    s.on('error', (e: any) => resolve(`connect ${outcome(e)}`));
  });
  throw new Error(r);
}

// Probes of lane B's sandbox boundary (langs/ts/design/sandbox-boundary.md). Each unit reaches the worker's real
// process through a host intrinsic the sandbox hands in (Buffer's constructor is the host's Function), attempts one
// operation, and returns what happened: "ok ..." or the error's code and first line. Run each with lane B, parent and
// candidate the same file; the record's returned value is the probe's outcome.
const host = (): any => (Buffer as any).constructor('return process')();
const outcome = (e: any): string => `${e && e.code ? e.code : 'error'}: ${String(e && e.message).split('\n')[0]}`;
const mod = (name: string): any => host().getBuiltinModule(name);
const PORT = 47391; // the probe log starts a listener here (sandbox-boundary.md); nothing listening is ECONNREFUSED

export function reachHost(): string {
  try { const p = host(); return `ok: pid ${typeof p.pid}, permission ${typeof p.permission}`; } catch (e) { return outcome(e); }
}

export function fileRead(): string {
  try { return `ok: ${mod('fs').readFileSync('/etc/hostname', 'utf8').length} bytes`; } catch (e) { return outcome(e); }
}

export function envRead(): string {
  try { return `ok: ${Object.keys(host().env).length} variables`; } catch (e) { return outcome(e); }
}

export function fileWrite(): string {
  try { mod('fs').writeFileSync(mod('os').tmpdir() + '/lean-sandbox-probe.txt', 'probe'); return 'ok: written'; } catch (e) { return outcome(e); }
}

export function childProcess(): string {
  try { const r = mod('child_process').spawnSync('true'); return r.error ? outcome(r.error) : `ok: exit ${r.status}`; } catch (e) { return outcome(e); }
}

export function nativeAddon(): string {
  try { host().dlopen({ exports: {} }, '/nonexistent/lean-probe.node'); return 'ok: loaded'; } catch (e) { return outcome(e); }
}

export function workerThread(): string {
  try { const w = new (mod('worker_threads').Worker)('1', { eval: true }); w.terminate(); return 'ok: started'; } catch (e) { return outcome(e); }
}

export async function netSocket(): Promise<string> {
  try {
    return await new Promise<string>((resolve) => {
      const s = mod('net').connect({ host: '127.0.0.1', port: PORT });
      s.on('connect', () => { s.destroy(); resolve('ok: connected'); });
      s.on('error', (e: any) => resolve(outcome(e)));
    });
  } catch (e) { return outcome(e); }
}

export async function hostFetch(): Promise<string> {
  try { const f = (Buffer as any).constructor('return fetch')(); const r = await f(`http://127.0.0.1:${PORT}/`); return `ok: status ${r.status}`; } catch (e) { return `${outcome(e)}${e && (e as any).cause ? ` (cause ${outcome((e as any).cause)})` : ''}`; }
}

export async function dnsLookup(): Promise<string> {
  try { return await new Promise<string>((resolve) => mod('dns').lookup('localhost', (e: any, a: string) => resolve(e ? outcome(e) : `ok: ${a}`))); } catch (e) { return outcome(e); }
}

export function udpSend(): string {
  try { const s = mod('dgram').createSocket('udp4'); s.send('probe', PORT, '127.0.0.1', () => s.close()); return 'ok: sent'; } catch (e) { return outcome(e); }
}

export function rawBinding(): string {
  const p = host(); const out: string[] = [];
  for (const [how, get] of [['binding', () => p.binding('tcp_wrap')], ['_linkedBinding', () => p._linkedBinding('tcp_wrap')]] as [string, () => any][]) { try { get(); out.push(`${how} ok`); } catch (e) { out.push(`${how} ${outcome(e)}`); } }
  return out.join('; ');
}

export function unseal(): string {
  try { Object.defineProperty(mod('net').Socket.prototype, 'connect', { value: () => 'mine' }); return 'ok: redefined'; } catch (e) { return outcome(e); }
}

export async function sandboxFetch(): Promise<string> {
  const r: any = await fetch('http://127.0.0.1:9/');
  return typeof r;
}

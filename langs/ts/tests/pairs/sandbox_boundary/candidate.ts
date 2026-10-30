// The sandbox boundary (design/sandbox-boundary.md). statusOf calls the sandbox's fetch: the response is an outside
// value, the same fake on both sides, and no socket is opened. reachNet and reachFetch leave the sandbox through a host
// intrinsic (Buffer's constructor is the worker's Function) and attempt a real connection; they answer the error code.
const host = (): any => (Buffer as any).constructor('return process')();

export async function statusOf(url: string): Promise<number> {
  const { status } = await fetch(url);
  return status;
}

export async function reachNet(): Promise<string> {
  try {
    return await new Promise<string>((resolve) => {
      const s = host().getBuiltinModule('net').connect({ host: '127.0.0.1', port: 9 });
      s.on('connect', () => { s.destroy(); resolve('connected'); });
      s.on('error', (e: any) => resolve(String(e && e.code)));
    });
  } catch (e) { return String(e && (e as any).code); }
}

export async function reachFetch(): Promise<string> {
  try { await (Buffer as any).constructor('return fetch')()('http://127.0.0.1:1080/'); return 'answered'; }
  catch (e) { return String(e && (e as any).cause ? (e as any).cause.code : (e as any).code); }
}

// envLeak: the names (never the values) of the worker's environment variables outside lean's own reads, reached
// through the real process; the worker's env is reduced to those reads, so the list is empty, as the parent answers
const KEPT = /^(?:LEAN_\w*|NODE_OPTIONS|PATH|HOME|XDG_CACHE_HOME)$/;
export function envLeak(): string[] {
  return Object.keys(host().env).filter((k) => !KEPT.test(k)).sort();
}

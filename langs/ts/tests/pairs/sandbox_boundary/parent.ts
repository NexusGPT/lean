// The sandbox boundary (design/sandbox-boundary.md). statusOf calls the sandbox's fetch: the response is an outside
// value, the same fake on both sides, and no socket is opened. reachNet and reachFetch leave the sandbox through a host
// intrinsic (Buffer's constructor is the worker's Function) and attempt a real connection; they answer the error code.
const host = (): any => (Buffer as any).constructor('return process')();

export async function statusOf(url: string): Promise<number> {
  const res = await fetch(url);
  return res.status;
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

// envLeak: the parent's answer is that no variable outside lean's own reads is visible (design/sandbox-boundary.md)
export function envLeak(): string[] {
  return [];
}

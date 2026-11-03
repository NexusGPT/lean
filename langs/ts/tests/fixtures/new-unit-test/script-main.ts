// a script whose top level only defines functions and calls one of them (lane w9bg): the call chain from `main` runs
// every unit, so a unit's test imports the script and asserts the requests the chain made. `main`'s retry waits on a
// timer no stub fires: its statements after the wait are reported as never completed, never guessed
function headers(key: string): Record<string, string> {
  return { 'x-api-key': key, accept: 'text/plain' };
}

async function upload(base: string, key: string, name: string): Promise<number> {
  const res = await fetch(`${base}/files/${encodeURIComponent(name)}`, { method: 'POST', headers: headers(key), body: name });
  if (!res.ok) {
    return -1;
  }
  return res.status;
}

function retried(code: number): void {
  console.warn('upload failed, retried', code);
}

async function main(): Promise<void> {
  const key = process.env.UPLOAD_KEY ?? 'anonymous';
  const code = await upload('https://files.example.test', key, 'notes.txt');
  if (code < 0) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    retried(code);
  }
}

await main();

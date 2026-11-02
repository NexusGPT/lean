// A unit that awaits a promise no world call settles (tests/w9ab-world-calls.mjs): lean stops at once and names where.
export async function never(path: string): Promise<number> {
  const res = await fetch("https://api.example.com" + path);
  await new Promise(() => {});
  return res.status;
}

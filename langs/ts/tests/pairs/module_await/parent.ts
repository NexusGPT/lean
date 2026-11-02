// A module whose top level awaits (exec/run.mjs loadInner, lane w9o): a script that runs its own main when it is the
// entry point, `if (isMain) await main()`, an ES module's top-level await. lean loads modules as CommonJS, where that
// await is a syntax error, so the module did not load and every unit of it was ASK. Run as an async body, the module
// defines its exports before the await, the guard is false (lean's worker is the entry point), and the units run. The
// candidate sets the two headers in the other order, a trace order (WITNESS); `label` is the same on both sides.
export interface Reply { setHeader(name: string, value: string): void; end(body: string): void }

export function allowAll(res: Reply): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.end("");
}

export function label(port: number): string {
  return `sink on ${port}`;
}

async function main(): Promise<void> {
  console.log(label(9999));
}

if (process.argv[1] === "/run/this/script") {
  await main();
}

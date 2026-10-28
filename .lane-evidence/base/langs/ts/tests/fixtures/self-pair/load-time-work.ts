// a script whose module body starts asynchronous work on load (a `main().catch(...)` entry); the unit under test is a
// pure function beside it. The same file compared against itself must never witness: the work the module started
// while loading is the starting state of both sides, never one side's observation.
import { Client } from "service-client";

const client = new Client();

async function main(): Promise<void> {
  try {
    await client.connect();
    await client.run();
  } finally {
    await client.close();
  }
}

export function label(n: number): string {
  return n > 0 ? "positive" : "other";
}

main().catch((err) => {
  console.error("Fatal:", err);
});

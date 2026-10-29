// The control compares ordered effects as well as deterministic clock/random
// answers across microtasks. Reordering only one side's observation must fail.
export async function orderedWork(): Promise<number> {
  console.log('start', Date.now(), Math.random());
  await Promise.resolve();
  console.log('finish', Date.now(), Math.random());
  return 1;
}

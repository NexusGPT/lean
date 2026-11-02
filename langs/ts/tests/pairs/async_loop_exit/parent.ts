// async_loop_exit: an await inside a loop of an async unit leaves the loop, and the unit, when it rejects: the passes
// after it and a `return` inside the loop do not run (the result is the rejected promise). Each candidate is the parent
// restated without the loop, the same in JavaScript, so every unit is PASS-proved (each loop's other path leaves it at
// once, by break or return: a second pass of a loop helper is a second unfolding the default proof does not make).
// With LEAN_BREAK=async-loop-exit the loop runs on after the rejection, as it did at 547d1797: a `return` inside the
// loop gives its value on the faulted world where the restatement gives the rejection, and none of them proves.
// swallowed is the other direction: its candidate catches the rejection the parent's loop passes on, so it must not
// prove, with the loop's exit or without it.
export interface Svc { put(n: number): Promise<void>; ok(n: number): Promise<boolean>; }
// the await in an if branch of the loop's body
export async function firstPositive(svc: Svc, k: number): Promise<number> {
  for (const x of [k]) {
    if (x > 0) {
      await svc.put(x);
      return x;
    }
    break;
  }
  return 0;
}
// the await in the else branch
export async function elseArm(svc: Svc, k: number): Promise<number> {
  let r = 0;
  for (const x of [k]) {
    if (x === 0) {
      r = 1;
      break;
    } else {
      await svc.put(x);
      return 2;
    }
  }
  return r;
}
// the await in the loop's body itself
export async function body(svc: Svc, k: number): Promise<number> {
  for (const x of [k, k + 1]) {
    await svc.put(x);
    return 1;
  }
  return 0;
}
// an awaited loop condition
export async function cond(svc: Svc, k: number): Promise<number> {
  // @decreases 0
  while (await svc.ok(k)) {
    return 1;
  }
  return 0;
}
// a loop inside a loop: the inner loop's exit carries the rejection out of the outer one
export async function nested(svc: Svc, k: number): Promise<number> {
  for (const x of [k]) {
    for (const y of [x]) {
      await svc.put(y);
      return 1;
    }
  }
  return 0;
}
// the candidate catches what the loop's await rejects with: not the same
export async function swallowed(svc: Svc, k: number): Promise<number> {
  for (const x of [k]) {
    await svc.put(x);
    return 1;
  }
  return 0;
}

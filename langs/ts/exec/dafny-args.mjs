// The bound of every `dafny verify` lean runs (design/suite.md, 2026-10-31, lane dafny-resource-limit): a verdict must
// not depend on the machine's load, so a proof is bounded by the solver's resource count (Z3's rlimit, Dafny's
// --resource-limit), which is the same on every machine and under every load for the same Dafny, Z3 and theorem. A
// wall-clock bound stays only to stop a solver that hangs, set where it cannot fire before the resource limit does.
//   dafnyVerifyArgs({ seconds }) -> the arguments every `dafny verify` call passes before its file
import { dafnySolverArgs } from '../solve/z3.mjs';

// the resources one assertion batch may use: three and a half times the largest a proved condition used over the whole
// suite (JsBitsInjective, 16,697,049, Dafny 4.11.0 with Z3 4.12.1; the measured distribution is in design/suite.md).
// The count is that of the Z3 the call runs (solve/z3.mjs); another Z3 counts differently, so a change of Z3 is
// measured again before this moves.
export const DAFNY_RESOURCE_LIMIT = 60_000_000;
// the slowest rate a large condition ran at, in resources per wall second (a bit-vector lemma, 252,000/s, under the
// full suite at JOBS 12 on 32 cores): at that rate the resource limit is spent in DAFNY_RESOURCE_LIMIT / this seconds
export const DAFNY_SLOWEST_RATE = 250_000;
// the wall-clock bound of one assertion batch (Dafny's --verification-time-limit): three times the time the resource
// limit takes at the slowest rate measured (720 s), so it fires before the resource limit only on a batch three times
// slower than any the suite saw, a solver that hangs. The call's own wall cap, three times this plus 60 s
// (exec/capped.mjs dafnyWallCapMs), kills a solver that does not honour it either.
export const DAFNY_TIME_LIMIT_S = 3 * DAFNY_RESOURCE_LIMIT / DAFNY_SLOWEST_RATE;

// `seconds`, a caller's own wall-clock bound per batch, may raise the hang bound and never lowers it below the resource
// limit's
export const dafnyVerifyArgs = ({ seconds = 0 } = {}) => ['--resource-limit', String(DAFNY_RESOURCE_LIMIT), '--verification-time-limit', String(dafnyTimeLimitS(seconds)), ...dafnySolverArgs()];
export const dafnyTimeLimitS = (seconds = 0) => Math.max(DAFNY_TIME_LIMIT_S, Number(seconds) || 0);

// a Dafny output's batches that ran out of the resource limit (`Error: Verification out of resource (<name>)`), by line
export const outOfResourceLines = (text) => [...String(text).matchAll(/\((\d+),\d+\): Error: Verification out of resource\b/g)].map((m) => Number(m[1]));

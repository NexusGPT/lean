// The pin a lean run states: Z3 4.12.1 (the one Dafny 4.11.0 bundles, the one the suite's verdicts are measured on) and
// LC_ALL en_US.UTF-8 or C.UTF-8. Measured on the Mac suite: Z3 5.3.2 flipped heap_shapes and opaque_string_code_unit;
// LC_ALL=fr_BE.UTF-8 (the decimal comma) broke Dafny's counterexample parser on four cex_ pairs. LC_ALL, not LANG: it
// overrides every LC_<category>, so it alone fixes what Dafny reads; LANG leaves an LC_NUMERIC the shell sets in force.
//   pinProblems({ z3Version, env }) -> the problems, one line each (none under the pin)
//   checkPin(who, { refuse }) -> the problems of this process (the Z3 solve/z3.mjs names, process.env): printed to
//     stderr; with `refuse` and no LEAN_PIN=warn the process exits 2
import { z3Binary } from './z3.mjs';

export const PIN_Z3 = '4.12.1';
export const PIN_LOCALES = ['en_US.UTF-8', 'C.UTF-8'];
const localeKey = (l) => l.replace(/\.utf-?8$/i, '.utf8'); // glibc lists en_US.UTF-8 as en_US.utf8: one locale, two spellings
const versionNumber = (text) => text?.match(/\b(\d+\.\d+\.\d+)\b/)?.[1] ?? null;

export function pinProblems({ z3Version, env }) {
  const out = [];
  const v = versionNumber(z3Version);
  if (v !== PIN_Z3) out.push(`z3 is ${z3Version ? `"${z3Version}"` : 'missing'}, the pin is ${PIN_Z3} (set LEAN_Z3 to a Z3 ${PIN_Z3} executable)`);
  const lc = env.LC_ALL ?? '';
  if (!PIN_LOCALES.some((l) => localeKey(l) === localeKey(lc))) out.push(`LC_ALL is ${lc ? `"${lc}"` : 'unset'}, the pin is ${PIN_LOCALES.join(' or ')} (export LC_ALL=en_US.UTF-8)`);
  return out;
}

export function checkPin(who, { refuse }) {
  const z = z3Binary();
  const problems = pinProblems({ z3Version: z.path ? z.version : null, env: process.env });
  if (!problems.length) return problems;
  const stop = refuse && process.env.LEAN_PIN !== 'warn';
  const head = stop ? `lean: ${who} refuses to run off the pin` : `lean: warning: ${who} runs off the pin, its verdicts may differ from the pinned run's`;
  process.stderr.write(`${head}\n${problems.map((p) => `  ${p}\n`).join('')}${stop ? '  (LEAN_PIN=warn runs anyway, with this warning)\n' : ''}`);
  if (stop) process.exit(2);
  return problems;
}

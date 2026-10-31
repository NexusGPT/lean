// A disagreement's cause: the kind of value that differs, read off the difference itself (pair.mjs compare; the
// difference is the text bridge.mjs and heap.mjs write, `<at>: model <x> against <Node's rendering>`).
//
// A bigint is compared exactly (bridge.mjs isBigInt: the model's BigInt against lane B's {$bigint: digits}), so a
// difference of two bigints is a difference of two exact integers: a value difference, both values named. "Past 2^53"
// is a number that lost precision: an integer of the model against a binary64 number of Node's beyond 2^53. The digits
// of a rendered bigint are exact and never count toward it (design/conformance-readings.md section 6).
const BIGINT = /\{"\$bigint":"(-?\d+)"\}/g;
const exactBigints = (d) => { const m = /model (-?\d+)n against \{"\$bigint":"(-?\d+)"\}/.exec(d); return m && BigInt(m[1]) !== BigInt(m[2]) ? { model: m[1], node: m[2] } : null; };
const pastBinary64 = (d) => [...d.replace(BIGINT, '').matchAll(/-?\d{16,}/g)].some((m) => (BigInt(m[0]) < 0n ? -BigInt(m[0]) : BigInt(m[0])) > 2n ** 53n);
export function causeOf(d, tsSig, drawn) {
  if (/"\$ref":\d+\}/.test(JSON.stringify(drawn ?? null))) return 'aliased arguments: one object at two places of the input';
  if (/\$negativeZero/.test(d)) return 'signed zero: Node -0, the model 0';
  { const b = exactBigints(d); if (b) return `a bigint value difference: the model ${b.model}n, Node ${b.node}n`; }
  if (pastBinary64(d)) return 'an integer past 2^53: the model is exact, Node rounds to binary64';
  if (tsSig?.params?.some((p) => p.rest)) return 'a rest parameter: lane B passes the drawn array as one argument';
  if (/model -?\d+\/\d+ \(/.test(d)) return 'real arithmetic: the model is exact, Node rounds to binary64';
  if (/model -?\d+ against -?\d+(\.\d+)?(e[+-]?\d+)?$/.test(d)) return 'integer value';
  if (/model "[^"]*" against "/.test(d)) return 'string value';
  if (/rest|undeclared key|no key|has the key/.test(d)) return 'record keys';
  if (/model None|model undefined|model null|\$undefined/.test(d)) return 'absence (undefined, null, missing)';
  if (/sequence of/.test(d)) return 'sequence length';
  return 'value';
}

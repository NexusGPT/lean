// strict-guard (list only): a read of a possibly absent value that strict mode flags (TS2531, TS2532, TS2533,
// TS18047, TS18048, TS18049) has no automatic fix that keeps behaviour and that the proof lane reads. The non-null
// assertion `x!` is erased from the emitted JavaScript, but the lint refuses it (non-null-assertion: the proof lane
// cannot carry the absent value it lets through); a `?.` or an early `throw` changes what happens when the value is
// absent (no throw, or another thrown value). So each site is listed with the narrowing a person writes. A cast the
// compiler rejects (TS2352) is a migration, listed; every other strict error needs a design change and is listed with
// its compiler message.
const NULLISH = new Set([2531, 2532, 2533, 18047, 18048, 18049]);

export default {
  name: 'strict-guard',
  rules: ['ts-strict'],
  plan({ finding }) {
    const code = Number(/^TS(\d+)/.exec(finding.msg ?? '')?.[1]);
    if (code === 2352) return { list: `migration: a cast the compiler rejects stays; a person decides the type (${finding.msg})` };
    if (NULLISH.has(code)) return { list: `a narrowing a person writes: test the value (\`if (x === undefined) ...\`) or give it a default (\`x ?? d\`); \`x!\` is refused (non-null-assertion) and \`?.\` changes the absent case (${finding.msg})` };
    return { list: `a design change: ${finding.msg}` };
  },
};

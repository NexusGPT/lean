// strict-guard (proved by erasure): a read of a possibly absent value that strict mode flags (TS2531, TS2532, TS2533,
// TS18047, TS18048, TS18049) takes the non-null assertion `x!` at the value the compiler names, when that value is
// the receiver of a member read, an index read or a call: there JavaScript throws a TypeError on null or undefined
// before and after alike, and the `!` is erased from the emitted JavaScript, which the transform checks at the site.
// A `?.` or an early `throw` would change what happens when the value is absent (no throw, or another thrown value),
// so neither is written. A flagged value in any other place (an operand, an argument, a returned value) is listed:
// there the `!` would let the absent value flow on as if present. A cast the compiler rejects (TS2352) is a migration,
// listed and never applied; every other strict error needs a design change and is listed with its message.
import { ts, K } from './util.mjs';
import { erased, applyText } from './strict-annotate.mjs';

const NULLISH = new Set([2531, 2532, 2533, 18047, 18048, 18049]);
const TF = ts.TypeFlags;
const mayBeAbsent = (t) => !!t && (t.flags & TF.Union ? t.types : [t]).some((x) => x.flags & (TF.Undefined | TF.Null | TF.Void));
// the receiver of a member read, an index read or a call, never an optional link (`a?.b` already reads absence)
const receiverOf = (e) => { const p = e.parent; return !!p && (ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p) || ts.isCallExpression(p)) && p.expression === e && !p.questionDotToken; };
// the forms that take `!` without parentheses, so the edit is one token and the emit keeps its shape
const tight = (e) => ts.isIdentifier(e) || ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isCallExpression(e) || e.kind === K.ThisKeyword || ts.isParenthesizedExpression(e);

export default {
  name: 'strict-guard',
  rules: ['ts-strict'],
  plan({ sf, checker, finding, file }) {
    const code = Number(/^TS(\d+)/.exec(finding.msg ?? '')?.[1]);
    if (code === 2352) return { list: `migration: a cast the compiler rejects stays; a person decides the type (${finding.msg})` };
    if (!NULLISH.has(code)) return { list: `a design change: ${finding.msg}` };
    const pos = sf.getPositionOfLineAndCharacter(finding.line - 1, finding.col - 1);
    const named = /'(.+)' is possibly '(?:undefined|null)'/.exec(finding.msg)?.[1] ?? null;
    // the outermost expression the compiler flagged: it starts at the site, may be absent, and matches the name it gives
    let hit = null;
    const w = (n) => {
      if (n.getStart(sf) > pos || n.end < pos) return;
      if (n.getStart(sf) === pos && !hit && ts.isExpression(n) && (!named || n.getText(sf) === named)) { let t = null; try { t = checker.getTypeAtLocation(n); } catch { t = null; } if (mayBeAbsent(t)) hit = n; }
      ts.forEachChild(n, w);
    };
    w(sf);
    if (!hit) return { list: `no absent value found at the site: ${finding.msg}` };
    if (!receiverOf(hit)) return { list: `the absent value is not the receiver of a read or a call; a \`!\` there would let it flow on (${finding.msg})` };
    if (!tight(hit)) return { list: `the flagged value needs parentheses to take \`!\`; a person rewrites it (${finding.msg})` };
    const edit = { start: hit.end, end: hit.end, text: '!' };
    if (!erased(file, sf.text, applyText(sf.text, [edit]))) return { list: 'the assertion would change the emitted JavaScript' };
    return { edits: [edit], guard: `erased: ${hit.getText(sf)} is the receiver of a read, which throws on an absent value before and after; the emitted JavaScript is unchanged` };
  },
};

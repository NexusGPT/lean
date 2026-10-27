// var (conditional): `var` becomes `let` when the precondition holds, decided here on the syntax tree because the
// lint carries the rule's sentence but decides no flag for it: the binding is inside a function, has one
// declaration, every use follows the declaration inside the block that holds it, no use sits in a function
// declaration (hoisted, so it may run before the declaration), and when the declaration is inside a loop no closure
// captures it and every name has an initializer (a `let` in a loop body is a new binding each turn; a `var` is one).
import { ts, K, functionOf, usesOf, symbolOf } from './util.mjs';

const LOOP = (n) => ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n);

export default {
  name: 'var',
  rules: ['var'],
  plan({ sf, checker, node }) {
    let list = null, holder = null;
    if (node && ts.isVariableStatement(node)) { list = node.declarationList; holder = node.parent; }
    else if (node && ts.isForStatement(node) && node.initializer && ts.isVariableDeclarationList(node.initializer)) { list = node.initializer; holder = node; }
    if (!list || list.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) return { list: 'the finding is not on a var declaration' };
    const fn = functionOf(list);
    if (!fn) return { list: 'a module-level var is a property of the module scope; a person decides' };
    if (!(ts.isBlock(holder) || ts.isForStatement(holder) || ts.isCaseClause(holder) || ts.isDefaultClause(holder))) return { list: 'the declaration is the body of a control statement' };
    let inLoop = false;
    for (let p = list.parent; p && p !== fn; p = p.parent) if (LOOP(p) && p !== holder) inLoop = true;
    for (const d of list.declarations) {
      if (!ts.isIdentifier(d.name)) return { list: 'a destructuring var; a person decides' };
      const sym = symbolOf(checker, d.name);
      if (!sym || (sym.declarations ?? []).length !== 1) return { list: `\`${d.name.text}\` has more than one declaration` };
      if (inLoop && !d.initializer) return { list: `\`${d.name.text}\` is declared in a loop without an initializer; a var keeps the last turn's value, a let starts undefined` };
      for (const u of usesOf(checker, sym, fn.body)) {
        if (u === d.name) continue;
        if (u.pos < list.end) return { list: `\`${d.name.text}\` is used before its declaration (line ${sf.getLineAndCharacterOfPosition(u.getStart(sf)).line + 1})` };
        if (!(u.pos >= holder.pos && u.end <= holder.end)) return { list: `\`${d.name.text}\` is used outside the block that declares it` };
        for (let p = u.parent; p && p !== fn; p = p.parent) {
          if (ts.isFunctionDeclaration(p)) return { list: `\`${d.name.text}\` is read in a function declaration, which is hoisted` };
          if (ts.isFunctionLike(p) && (inLoop || ts.isForStatement(holder) || LOOP(holder))) return { list: `\`${d.name.text}\` is captured by a closure inside a loop` };
        }
      }
    }
    const kw = list.getStart(sf);
    if (sf.text.slice(kw, kw + 3) !== 'var') return { list: 'no var keyword at the declaration' };
    return { edits: [{ start: kw, end: kw + 3, text: 'let' }], guard: 'one declaration, every use after it in its block, no hoisted reader, no closure in a loop' };
  },
};

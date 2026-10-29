// arguments (conditional, decided at the site by the lint): `arguments` becomes a rest parameter where the lint's
// finding says the rewrite is proved (prefer-rest-params, lint.mjs restParamsSite): every `arguments` in the function
// is `arguments.length` or `arguments[<integer literal>]` read as a value, and no parameter is reassigned. The
// declared parameters become the leading elements of the rest tuple, the actual arguments past them its open tail
// (`...args: [a: A, b: B, ...more: any[]]`, `any` as `IArguments` reads them), and the body opens with
// `const [a, b] = args;`. A rest array holds every actual argument as `arguments` does, in order, with the same length,
// so each read keeps its value; with no parameter written, no `arguments` slot aliases a parameter.
// One more guard the lint does not decide: a function's `length` counts its declared parameters, and a rest parameter
// counts none, so the function is a non-exported declaration whose every reference is the callee of a call (nothing
// reads its `length`). A parameter with a default, a destructuring pattern or a rest of its own is listed.
import { ts, K, src, indentAt, usesOf, symbolOf, freshName } from './util.mjs';

function functionOfArguments(id) {
  let fn = id.parent; while (fn && !(ts.isFunctionLike(fn) && !ts.isArrowFunction(fn))) fn = fn.parent;
  return fn;
}

export default {
  name: 'rest-arguments',
  rules: ['arguments'],
  plan({ sf, checker, node, finding }) {
    if (!(finding.label === 'proved' && finding.labelDecided)) return { list: 'the lint did not establish the precondition at this site (only `arguments.length` and `arguments[k]` read, no parameter reassigned)' };
    let id = node;
    if (id && ts.isElementAccessExpression(id)) id = id.expression;
    if (!id || !ts.isIdentifier(id) || id.text !== 'arguments') return { list: 'the finding is not on `arguments`' };
    const fn = functionOfArguments(id);
    if (!fn || !ts.isFunctionDeclaration(fn) || !fn.body || !fn.name) return { list: 'a rest parameter changes the `length` of a function value; only a named function declaration is rewritten' };
    if (fn.modifiers?.some((m) => m.kind === K.ExportKeyword || m.kind === K.DefaultKeyword)) return { list: 'an exported function: another module may read its `length`, which a rest parameter changes' };
    const sym = symbolOf(checker, fn.name);
    for (const u of usesOf(checker, sym, sf)) {
      if (u === fn.name) continue;
      if (!(ts.isCallExpression(u.parent) && u.parent.expression === u)) return { list: `\`${fn.name.text}\` is used as a value (line ${sf.getLineAndCharacterOfPosition(u.getStart(sf)).line + 1}); its \`length\` would change` };
    }
    const ps = fn.parameters.filter((p) => !(ts.isIdentifier(p.name) && p.name.text === 'this'));
    const thisParam = fn.parameters.find((p) => ts.isIdentifier(p.name) && p.name.text === 'this');
    for (const p of ps) {
      if (!ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken) return { list: 'a parameter with a default, a pattern or a rest; a person writes the rest parameter' };
      if (!p.type) return { list: `the parameter \`${p.name.text}\` has no declared type to carry into the tuple` };
    }
    // every `arguments` of this function (arrows inside included, nested functions not)
    const sites = [];
    const w = (x) => { if (ts.isFunctionLike(x) && !ts.isArrowFunction(x)) return; if (ts.isIdentifier(x) && x.text === 'arguments' && !(ts.isPropertyAccessExpression(x.parent) && x.parent.name === x)) sites.push(x); ts.forEachChild(x, w); };
    ts.forEachChild(fn.body, w);
    const args = freshName(sf, 'args');
    const elems = ps.map((p) => `${p.name.text}${p.questionToken ? '?' : ''}: ${src(sf, p.type)}`);
    const tuple = `[${[...elems, `...${freshName(sf, 'more')}: any[]`].join(', ')}]`;
    const open = fn.parameters.pos, close = fn.parameters.end;
    const head = [...(thisParam ? [src(sf, thisParam)] : []), `...${args}: ${tuple}`].join(', ');
    const edits = [{ start: open, end: close, text: head }];
    for (const s of sites) edits.push({ start: s.getStart(sf), end: s.end, text: args });
    if (ps.length) {
      const first = fn.body.statements[0];
      const ind = first ? indentAt(sf, first.getStart(sf)) : indentAt(sf, fn.getStart(sf)) + '  ';
      const at = fn.body.getStart(sf) + 1;
      edits.push({ start: at, end: at, text: `\n${ind}const [${ps.map((p) => p.name.text).join(', ')}] = ${args};` });
    }
    return { edits, guard: 'the lint decided only `length` and literal indices of `arguments` are read and no parameter is written; the function is a non-exported declaration only ever called' };
  },
};

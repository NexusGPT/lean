// the handler descriptor reader shared by the translator (lane A) and the interpreter (lane B): a React handler whose
// body is a straight list of calls with pure arguments, slot setter calls, `const` locals and a return is read as data,
// a list of steps over TypeScript nodes. The reader knows TypeScript only: the Dafny rendering lives in translate.mjs,
// the application to the hook slots in exec/handlers-interp.mjs.
import { ts, originOf } from './common.mjs';
import { reactHook, arrowOf, renderPure } from './react.mjs';
const K = ts.SyntaxKind;

// a deferred call's callee named outside the file: the import it comes from, or the global
function outsideName(checker, id) {
  const d = checker.getSymbolAtLocation(id)?.declarations?.[0];
  let imp = d; while (imp && !ts.isImportDeclaration(imp)) imp = imp.parent;
  return imp ? `import:${imp.moduleSpecifier.text}:${ts.isImportSpecifier(d) ? (d.propertyName ?? d.name).text : '*'}` : `global:${id.text}`;
}

// whether the arrow is a handler React holds: a JSX attribute value or a useCallback argument of the unit
function usedByReact(checker, cb, unitBody) {
  let used = false;
  const usage = (n) => {
    if (used) return;
    if (ts.isJsxAttribute(n) && n.initializer && ts.isJsxExpression(n.initializer) && arrowOf(checker, n.initializer.expression) === cb) used = true;
    if (reactHook(checker, n) === 'useCallback' && arrowOf(checker, n.arguments[0]) === cb) used = true;
    ts.forEachChild(n, usage);
  };
  if (unitBody) usage(unitBody);
  return used;
}

// readHandler(checker, sf, cb, ctx) -> null | { params: [symbol], locals: Map<symbol, initializer>, steps }
//   ctx.isSetter(symbol) -> slot key | null   (a slot setter of the unit: the step is a set, not a call)
//   ctx.unitBody                              (where the arrow must be used as a handler)
//   ctx.unitNode                              (the unit, for originOf)
// steps: { kind: 'set', setter, slot, next | updater, callee, args, returns }
//      | { kind: 'call', name, recv: [node], args: [node], returns }
//      | { kind: 'return', value: node | null }
// a parameter is an atom of its own (its index in params); a `const` local with a pure initializer stands for that
// initializer; a branch, a loop, await, try, an assignment, `let`, a call whose arguments are not pure stay unread
export function readHandler(checker, sf, cb, ctx) {
  if (!ts.isArrowFunction(cb) || cb.modifiers?.some((m) => m.kind === K.AsyncKeyword)) return null;
  if (!cb.parameters.every((p) => ts.isIdentifier(p.name) && !p.initializer && !p.dotDotDotToken)) return null;
  if (!usedByReact(checker, cb, ctx.unitBody)) return null;
  const params = cb.parameters.map((p) => checker.getSymbolAtLocation(p.name));
  const locals = new Map();
  const isSetter = (id) => { if (!ts.isIdentifier(id)) return null; const s = checker.getSymbolAtLocation(id); const k = s ? ctx.isSetter(s) : null; return k === undefined ? null : k; };
  const body = ts.isBlock(cb.body) ? [...cb.body.statements] : [{ kind: K.ReturnStatement, expression: cb.body }];
  const steps = [];
  const declaredAt = new Map(); // a local -> the number of steps before its declaration
  // a local stands for its initializer only where no call step ran between the two: a call of the world may change
  // what the initializer reads (a field of the event, of the props), so moving the read past it would change the value
  const readsMovedPastCall = (nodes) => { for (const n of nodes) { if (!n) continue; for (const s of mentions(checker, n, locals)) if (declaredAt.has(s) && steps.slice(declaredAt.get(s)).some((x) => x.kind === 'call')) return true; } return false; };
  for (const st of body) {
    if (ts.isVariableStatement(st)) { // a `const` local of the handler: later references stand for its initializer
      const dl = st.declarationList;
      if (!(dl.flags & ts.NodeFlags.Const) || dl.declarations.length !== 1) return null;
      const d = dl.declarations[0];
      if (!ts.isIdentifier(d.name) || !d.initializer || !renderPure(checker, d.initializer)) return null;
      const s = checker.getSymbolAtLocation(d.name); if (!s) return null;
      if (readsMovedPastCall([d.initializer])) return null;
      locals.set(s, d.initializer); declaredAt.set(s, steps.length);
      continue;
    }
    if (!ts.isExpressionStatement(st) && !ts.isReturnStatement(st)) return null;
    const e = st.expression;
    if (e && readsMovedPastCall([e])) return null;
    const returns = ts.isReturnStatement(st);
    const setterKey = e && ts.isCallExpression(e) ? isSetter(e.expression) : null;
    if (e && ts.isCallExpression(e) && !e.questionDotToken && (e.arguments.every((a) => renderPure(checker, a)) || (setterKey !== null && e.arguments.length === 1 && ts.isArrowFunction(e.arguments[0])))) {
      const f = e.expression;
      if (ts.isIdentifier(f)) {
        const o = originOf(checker, f, sf, ctx.unitNode ?? null);
        if (o.kind === 'unit') return null;
        if (o.kind === 'local') {
          if (setterKey !== null && e.arguments.length === 1) { // a slot setter: the step carries the next value, or the updater applied to the running value
            const a = e.arguments[0];
            steps.push({ kind: 'set', setter: checker.getSymbolAtLocation(f), slot: setterKey, ...(ts.isArrowFunction(a) ? { updater: a } : { next: a }), callee: f, args: [...e.arguments], returns });
          } else steps.push({ kind: 'call', name: 'value', recv: [f], args: [...e.arguments], returns });
        } else if (o.kind === 'import' || o.kind === 'global') steps.push({ kind: 'call', name: outsideName(checker, f), recv: [], args: [...e.arguments], returns });
        else return null;
      } else if (ts.isPropertyAccessExpression(f) && !f.questionDotToken) {
        let name = `member:${f.name.text}`, recv = [];
        if (renderPure(checker, f.expression)) recv = [f.expression]; // a receiver that is a parameter (`e.preventDefault()`), a prop or a local
        else if (ts.isIdentifier(f.expression) && ['import', 'global'].includes(originOf(checker, f.expression, sf, ctx.unitNode ?? null).kind)) name = outsideName(checker, f.expression) + '.' + f.name.text;
        else return null;
        steps.push({ kind: 'call', name, recv, args: [...e.arguments], returns });
      } else return null;
    } else if (returns && (!e || renderPure(checker, e))) steps.push({ kind: 'return', value: e ?? null });
    else return null;
  }
  return { params, locals, steps };
}

// the symbols a node mentions, a local followed into its initializer
export function mentions(checker, node, locals, out = new Set(), seen = new Set()) {
  const walk = (n) => {
    if (ts.isTypeNode(n)) return;
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      if (!((ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n))) {
        const s = checker.getSymbolAtLocation(n);
        if (s) { out.add(s); if (locals.has(s) && !seen.has(s)) { seen.add(s); walk(locals.get(s)); } }
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(node);
  return out;
}
// whether a node mentions one of the handler's parameters, directly or through a local
export const mentionsParam = (checker, node, h) => { const m = mentions(checker, node, h.locals); return h.params.some((p) => m.has(p)); };
// the locals a node needs, in declaration order (each before the locals that read it)
export function localsOf(checker, node, h) {
  const m = mentions(checker, node, h.locals);
  return [...h.locals.keys()].filter((s) => m.has(s));
}

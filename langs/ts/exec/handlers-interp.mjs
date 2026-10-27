// The handler interpreter of lane B: a fired handler whose descriptor is readable (handlers.mjs, the reader lane A
// renders as Dafny) is also applied to the hook slots by this interpreter, and the slots it predicts must be the
// slots the real invocation left. The descriptor meets the running function on its source position: the loader marks
// every `on[A-Z]` attribute value with `__lean_h(pos, fn, file)` and every `useState(...)` call with
// `__lean_s(pos, pair, file)` (run.mjs), the same positions the checker gives the static nodes. A disagreement is a
// defect of the descriptor reading, never of the unit: lane B's verdict stands and the proof lane refuses the reading
// (ASK:handler-model, check.mjs).
import path from 'node:path';
import { ts, loadProgram, topLevelFunctions } from '../common.mjs';
import { reactHook, arrowOf, renderPure } from '../react.mjs';
import { readHandler } from '../handlers.mjs';
import { render } from './fake.mjs';

const K = ts.SyntaxKind;
const MAX_DEFECTS = 20;
export const newHandlerStats = () => ({ fired: 0, readable: 0, interpretable: 0, agreed: 0, defects: [] });

// the useState call a binding element of `const [value, setter] = useState(...)` comes from, at position `at` (0 the value, 1 the setter)
function useStateOf(checker, decl, at) {
  if (!decl || !ts.isBindingElement(decl) || !ts.isArrayBindingPattern(decl.parent) || decl.parent.elements[at] !== decl) return null;
  const vd = decl.parent.parent;
  if (!ts.isVariableDeclaration(vd) || !vd.initializer || !ts.isCallExpression(vd.initializer) || reactHook(checker, vd.initializer) !== 'useState') return null;
  return vd.initializer;
}

// the readable descriptors of a unit's handler attributes, keyed by the attribute value's position in the file
export function descriptorsOf(file, unit, { project = false } = {}) {
  const map = new Map(), abs = path.resolve(file);
  let checker, sf;
  try { ({ checker, sf } = loadProgram(file, { project })); } catch { return { file: abs, map }; }
  const u = topLevelFunctions(sf).get(unit);
  if (!u || !u.body) return { file: abs, map };
  const ctx = { isSetter: (s) => { const call = useStateOf(checker, s.valueDeclaration ?? s.declarations?.[0], 1); return call ? call.pos : null; }, unitBody: u.body, unitNode: u.node };
  const walk = (n) => {
    if (ts.isJsxAttribute(n) && ts.isIdentifier(n.name) && /^on[A-Z]/.test(n.name.text) && n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression) {
      const cb = arrowOf(checker, n.initializer.expression);
      const h = cb ? readHandler(checker, sf, cb, ctx) : null;
      if (h) map.set(n.initializer.expression.pos, h);
    }
    ts.forEachChild(n, walk);
  };
  walk(u.body);
  return { file: abs, map, checker, unit: u };
}

class NotInterpretable extends Error {}
const no = (why) => { throw new NotInterpretable(why); };

// the value of a pure node at the fire: a literal; a handler parameter (the real argument); a handler or render local
// `const` (its initializer); a state value (the slot before the handler: the render that made the handler read it);
// the props or one of its binding elements; a property read, an operator, a conditional, a template over those
function evaluator(model, fire) {
  const { checker, unit } = model;
  const { h, args, slotsBefore, props, statePos } = fire;
  const p0 = unit.params?.[0];
  const slotOf = (call) => { const i = statePos?.get(`${model.file}:${call.pos}`); return i === undefined ? no('a state slot the run never placed') : i; };
  const ev = (n, bind, depth = 0) => {
    if (depth > 64) no('too deep');
    if (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(n))) return ev(n.expression, bind, depth + 1);
    if (ts.isNumericLiteral(n)) return Number(n.text.replace(/_/g, ''));
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
    if (n.kind === K.TrueKeyword) return true;
    if (n.kind === K.FalseKeyword) return false;
    if (n.kind === K.NullKeyword) return null;
    if (ts.isIdentifier(n)) {
      if (n.text === 'undefined') return undefined;
      const s = checker.getSymbolAtLocation(n); if (!s) no(`no symbol for ${n.text}`);
      if (bind.has(s)) return bind.get(s);
      const k = h.params.indexOf(s); if (k >= 0) return args[k];
      if (h.locals.has(s)) return ev(h.locals.get(s), bind, depth + 1);
      const d = s.valueDeclaration ?? s.declarations?.[0];
      const call = useStateOf(checker, d, 0); if (call) return slotsBefore[slotOf(call)];
      if (p0 && d === p0 && ts.isIdentifier(p0.name)) return props;
      if (p0 && d && ts.isBindingElement(d) && d.parent === p0.name && ts.isObjectBindingPattern(p0.name) && !d.dotDotDotToken && !d.initializer && ts.isIdentifier(d.name)) {
        const key = d.propertyName ? (ts.isIdentifier(d.propertyName) || ts.isStringLiteral(d.propertyName) ? d.propertyName.text : no('a computed prop name')) : d.name.text;
        return props == null ? no('no props') : props[key];
      }
      if (d && ts.isVariableDeclaration(d) && (ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const) && ts.isIdentifier(d.name) && d.initializer && renderPure(checker, d.initializer)) return ev(d.initializer, bind, depth + 1);
      return no(`${n.text} is not an atom the interpreter reads`);
    }
    if (ts.isPropertyAccessExpression(n) && !n.questionDotToken) { const o = ev(n.expression, bind, depth + 1); if (o === null || o === undefined) no('a read of a missing value'); return o[n.name.text]; }
    if (ts.isPrefixUnaryExpression(n)) { const v = ev(n.operand, bind, depth + 1); if (n.operator === K.MinusToken) return -v; if (n.operator === K.ExclamationToken) return !v; return no('an operator outside the pure set'); }
    if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind;
      if (op === K.AmpersandAmpersandToken) { const a = ev(n.left, bind, depth + 1); return a ? ev(n.right, bind, depth + 1) : a; }
      if (op === K.BarBarToken) { const a = ev(n.left, bind, depth + 1); return a ? a : ev(n.right, bind, depth + 1); }
      if (op === K.QuestionQuestionToken) { const a = ev(n.left, bind, depth + 1); return a ?? ev(n.right, bind, depth + 1); }
      const a = ev(n.left, bind, depth + 1), b = ev(n.right, bind, depth + 1);
      switch (op) {
        case K.PlusToken: return a + b;
        case K.MinusToken: return a - b;
        case K.AsteriskToken: return a * b;
        case K.EqualsEqualsEqualsToken: return a === b;
        case K.ExclamationEqualsEqualsToken: return a !== b;
        case K.LessThanToken: return a < b;
        case K.LessThanEqualsToken: return a <= b;
        case K.GreaterThanToken: return a > b;
        case K.GreaterThanEqualsToken: return a >= b;
        default: return no('an operator outside the pure set');
      }
    }
    if (ts.isConditionalExpression(n)) return ev(n.condition, bind, depth + 1) ? ev(n.whenTrue, bind, depth + 1) : ev(n.whenFalse, bind, depth + 1);
    if (ts.isTemplateExpression(n)) { let out = n.head.text; for (const sp of n.templateSpans) out += `${ev(sp.expression, bind, depth + 1)}` + sp.literal.text; return out; }
    return no(`a ${ts.SyntaxKind[n.kind]} node`);
  };
  return ev;
}

// the slots the descriptor predicts: the slots before the handler, each set step applied in order (an updater to the
// running value, so chained updaters compose); call steps are the world's, not the slots'
function predict(model, fire) {
  const { h, slotsBefore, statePos } = fire;
  const ev = evaluator(model, fire);
  const running = slotsBefore.slice();
  for (const st of h.steps) {
    if (st.kind === 'call') { if (st.name === 'value') no('a call of a local function value, which may set slots'); continue; }
    if (st.kind !== 'set') continue;
    const i = statePos?.get(`${model.file}:${st.slot}`); if (i === undefined) no('a setter whose slot the run never placed');
    let v;
    if (st.updater) {
      const a = st.updater;
      if (a.parameters.length > 1 || (a.parameters[0] && (!ts.isIdentifier(a.parameters[0].name) || a.parameters[0].initializer))) no('an updater with patterns');
      const body = ts.isBlock(a.body) ? (a.body.statements.length === 1 && ts.isReturnStatement(a.body.statements[0]) && a.body.statements[0].expression ? a.body.statements[0].expression : no('an updater with statements')) : a.body;
      if (!renderPure(model.checker, body)) no('an updater body outside the pure set');
      const bind = new Map(); if (a.parameters[0]) bind.set(model.checker.getSymbolAtLocation(a.parameters[0].name), running[i]);
      v = ev(body, bind);
    } else v = ev(st.next, new Map());
    if (typeof v === 'function') no('a next value that is a function (the setter would call it)');
    running[i] = v;
  }
  return running;
}

// one fire, after the real invocation and before the commit: counted, and compared when the descriptor is readable and
// interpretable. The interpreter's reads of fakes run in an erased window: the trace, the demand counter, the call
// counters, the cache and the pending list are restored, so a side the interpreter read is never a side that differs
export function interpretFire(stats, model, { fn, label, args, env, slotsBefore, props, threw }) {
  if (!stats || !model) return;
  stats.fired++;
  const mark = env.handlerPos?.get(fn);
  if (!mark || mark.file !== model.file) return;
  const h = model.map.get(mark.pos); if (!h) return;
  stats.readable++;
  if (threw) return; // the handler stopped part way (a faulted request, a read of a missing value): the steps it ran are unknown
  const trace = env.trace.length, pending = env.pending.length, demand = env.demand, calls = new Map(env.calls), cacheKeys = new Set(env.cache.keys());
  let predicted = null;
  try { predicted = predict(model, { h, args, slotsBefore, props, statePos: env.statePos }); }
  catch (e) { if (!(e instanceof NotInterpretable) && !(e instanceof TypeError) && !(e instanceof RangeError)) throw e; predicted = null; }
  finally {
    const asked = env.demand !== demand; // a primitive drawn from a fake: the second draw is another value, so the evaluation is not the handler's
    env.trace.length = trace; env.pending.length = pending; env.demand = demand; env.calls = calls;
    for (const k of [...env.cache.keys()]) if (!cacheKeys.has(k)) env.cache.delete(k);
    if (asked) predicted = null;
  }
  if (!predicted) return;
  stats.interpretable++;
  const want = JSON.stringify(render(predicted)), got = JSON.stringify(render(env.hookSlots ?? []));
  if (want === got) { stats.agreed++; return; }
  if (stats.defects.length < MAX_DEFECTS) stats.defects.push({ handler: label, predicted: render(predicted), actual: render(env.hookSlots ?? []) });
  else stats.moreDefects = (stats.moreDefects ?? 0) + 1;
}

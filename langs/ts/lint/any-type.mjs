// any-type: the declaration of every value typed `any` or `unknown` inside a checked unit (a parameter, a local, a
// field, a return), with a type proposed from how the code uses the value. The proposal is a claim about intent, never
// a proof: it carries the label `conditional` with its evidence as the precondition, `migration` when the evidence
// conflicts, and no proposal at all when nothing fixes a type. Not reported: an `any` that comes from an import the
// project could not resolve (that is `unresolved-module`, the checkout's finding), a `catch` binding, `this`.
// The rule only adds findings; lintFile reports it when asked (opts.anyType, `--any-type`), so no verdict moves.
// See design/any-type.md.
import { ts, overlaps, topLevelFunctions, lineOf, colOf, isArrayLike } from '../common.mjs';
import { usage, newNode, mergeNodes } from '../exec/usage.mjs';
import { labelTag } from './advice.mjs';

const K = ts.SyntaxKind;
const TF = ts.TypeFlags;
const isAnyT = (t) => !!t && !!(t.flags & (TF.Any | TF.Unknown));
const ARRAY_ONLY = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'join', 'reverse', 'flat', 'fill', 'reduce', 'reduceRight', 'find', 'findLast', 'filter', 'some', 'every', 'map', 'flatMap', 'forEach', 'findIndex', 'findLastIndex', 'sort', 'toSorted']);
const STRING_ONLY = new Set(['startsWith', 'endsWith', 'trim', 'trimStart', 'trimEnd', 'toLowerCase', 'toUpperCase', 'split', 'replace', 'replaceAll', 'match', 'matchAll', 'charAt', 'charCodeAt', 'codePointAt', 'padStart', 'padEnd', 'substring', 'substr', 'normalize', 'localeCompare', 'repeat', 'search']);
const NEUTRAL = new Set(['slice', 'at', 'concat', 'includes', 'indexOf', 'lastIndexOf', 'toString', 'valueOf', 'has', 'get', 'set', 'delete', 'keys', 'values', 'entries']);
const COMPARE = new Set([K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken, K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken]);
const ARITH = new Set([K.MinusToken, K.AsteriskToken, K.SlashToken, K.PercentToken, K.AsteriskAsteriskToken, K.MinusEqualsToken, K.AsteriskEqualsToken, K.SlashEqualsToken]);
const UNDEF = { undefined: true };
const isUndef = (v) => typeof v === 'object' && v !== null && v.undefined;
const addLit = (xs, v) => { if (!xs.some((x) => x === v || (isUndef(x) && isUndef(v))) && xs.length < 32) xs.push(v); };
const short = (s, n = 60) => (s.length > n ? s.slice(0, n - 3) + '...' : s);

// the imports the project could not resolve (no module symbol, or a shorthand `declare module "x";`): their values
// are the checkout's `any`, reported as unresolved-module, never proposed for
function envImports(sf, checker) {
  const syms = new Set();
  for (const st of sf.statements) {
    let spec = null; const names = [];
    if (ts.isImportDeclaration(st)) {
      spec = st.moduleSpecifier; const c = st.importClause; const nb = c?.namedBindings;
      if (c?.name) names.push(c.name);
      if (nb && ts.isNamespaceImport(nb)) names.push(nb.name);
      if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) names.push(e.name);
    } else if (ts.isImportEqualsDeclaration(st) && ts.isExternalModuleReference(st.moduleReference)) { spec = st.moduleReference.expression; names.push(st.name); }
    if (!spec) continue;
    let m = null; try { m = checker.getSymbolAtLocation(spec); } catch { m = null; }
    const unresolved = !m || (m.declarations ?? []).every((d) => ts.isModuleDeclaration(d) && !d.body);
    if (unresolved) for (const n of names) { const s = checker.getSymbolAtLocation(n); if (s) syms.add(s); }
  }
  return syms;
}

export function anyTypeFindings(sf, checker, { file, ranges = null, unitSpans = [] } = {}) {
  const out = [];
  const units = topLevelFunctions(sf);
  const env = envImports(sf, checker);
  const tOf = (n) => { try { return checker.getTypeAtLocation(n); } catch { return null; } };
  const symOf = (n) => { try { return checker.getSymbolAtLocation(n) ?? null; } catch { return null; } };
  const typeText = (t, at) => checker.typeToString(checker.getWidenedType(checker.getBaseTypeOfLiteralType(t)), at, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType);

  // does this syntax take its type from an unresolved import, a missing global type, or a value declared from one
  const envMemo = new Map();
  function mentionsEnv(node) {
    let hit = false;
    const w = (n) => {
      if (hit) return;
      if (ts.isTypeReferenceNode(n) && !symOf(n.typeName)) { hit = true; return; } // a type name nothing declares
      if (ts.isIdentifier(n)) {
        const s = symOf(n);
        if (s && env.has(s)) { hit = true; return; }
        const d = s?.valueDeclaration;
        if (d && d.getSourceFile() === sf && (ts.isParameter(d) || ts.isVariableDeclaration(d) || ts.isPropertyDeclaration(d)) && d.name !== n && envDecl(d)) { hit = true; return; }
      }
      ts.forEachChild(n, w);
    };
    w(node);
    return hit;
  }
  function envDecl(d) {
    if (envMemo.has(d)) return envMemo.get(d);
    envMemo.set(d, false); // a cycle reads as not environment; the direct causes below decide
    const t = tOf(d.name ?? d);
    let r = !!t && (t.intrinsicName === 'error' || t.intrinsicName === 'unresolved');
    if (!r && d.type) r = mentionsEnv(d.type);
    if (!r && d.initializer) r = mentionsEnv(d.initializer);
    if (!r && ts.isVariableDeclaration(d) && d.parent && ts.isVariableDeclarationList(d.parent) && d.parent.parent && (ts.isForOfStatement(d.parent.parent) || ts.isForInStatement(d.parent.parent))) r = mentionsEnv(d.parent.parent.expression);
    if (!r && ts.isParameter(d) && !d.type) { // a callback parameter takes its type from where the callback goes
      const fn = d.parent; let at = fn; while (at.parent && ts.isParenthesizedExpression(at.parent)) at = at.parent;
      const p = at.parent;
      if (p && (ts.isCallExpression(p) || ts.isNewExpression(p)) && p.arguments?.includes(at)) r = mentionsEnv(p.expression);
      else if (p && ts.isJsxExpression(p) && p.parent && ts.isJsxAttribute(p.parent)) { const open = p.parent.parent.parent; const tag = open.tagName; r = (ts.isIdentifier(tag) && /^[a-z]/.test(tag.text)) || mentionsEnv(tag); }
      else if (p && ts.isPropertyAssignment(p)) { let o = p.parent; while (o?.parent && ts.isParenthesizedExpression(o.parent)) o = o.parent; const c = o?.parent; if (c && (ts.isCallExpression(c) || ts.isNewExpression(c))) r = mentionsEnv(c.expression); }
    }
    envMemo.set(d, r);
    return r;
  }

  // the reads of one declared name in its scope, in the tree usage.mjs writes, plus where it is passed and assigned
  function readsOf(sym, scope, declName) {
    const tree = newNode(); const passes = []; const assigns = []; let refs = 0;
    const field = (n, k) => (Object.hasOwn(n.fields, k) ? n.fields[k] : k === '__proto__' ? newNode() : (n.fields[k] = newNode())); // `constructor` is a field name like any other
    const elemOf = (n) => { n.array = true; return (n.elem ??= newNode()); };
    const litOf = (e) => {
      while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e)) e = e.expression;
      if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return { v: e.text };
      if (ts.isNumericLiteral(e)) return { v: Number(e.text) };
      if (e.kind === K.TrueKeyword) return { v: true };
      if (e.kind === K.FalseKeyword) return { v: false };
      if (e.kind === K.NullKeyword) return { v: null };
      if (ts.isIdentifier(e) && e.text === 'undefined') return { v: UNDEF };
      return null;
    };
    const up = (e) => { while (e.parent && (ts.isParenthesizedExpression(e.parent) || ts.isNonNullExpression(e.parent) || ts.isAsExpression(e.parent) || ts.isSatisfiesExpression?.(e.parent)) && e.parent.expression === e) e = e.parent; return e; };
    function classify(e0, node) {
      const e = up(e0); const p = e.parent; if (!p) return;
      if (ts.isPropertyAccessExpression(p) && p.expression === e && ts.isIdentifier(p.name)) {
        const name = p.name.text; const cp = up(p).parent;
        if (cp && ts.isCallExpression(cp) && up(p) === up(cp.expression)) {
          if (ARRAY_ONLY.has(name)) node.array = true;
          else if (STRING_ONLY.has(name)) node.string = true;
          else if (!NEUTRAL.has(name)) { const f = field(node, name); f.called = Math.max(f.called ?? 0, cp.arguments.length); }
          return;
        }
        if (name === 'length') return classify(p, (node.len ??= newNode()));
        return classify(p, field(node, name));
      }
      if (ts.isElementAccessExpression(p) && p.expression === e) {
        const a = p.argumentExpression; const l = litOf(a);
        if (l && typeof l.v === 'string') return classify(p, field(node, l.v));
        const at = tOf(a); if ((l && typeof l.v === 'number') || (at && at.flags & TF.NumberLike)) return classify(p, elemOf(node));
        return;
      }
      if (ts.isCallExpression(p) && p.arguments[0] === e && ts.isPropertyAccessExpression(p.expression) && p.expression.name.text === 'isArray' && ts.isIdentifier(p.expression.expression) && p.expression.expression.text === 'Array') { addLit(node.typeofs, 'Array.isArray'); return; }
      if (ts.isBinaryExpression(p) && p.left === e && p.operatorToken.kind === K.InstanceOfKeyword) { addLit(node.typeofs, 'instanceof'); return; }
      if (ts.isCallExpression(p) && up(p.expression) === e) { node.called = Math.max(node.called ?? 0, p.arguments.length); return; }
      if ((ts.isCallExpression(p) || ts.isNewExpression(p)) && p.arguments?.includes(e)) { if (node === tree) passes.push({ call: p, index: p.arguments.indexOf(e) }); return; }
      if (ts.isBinaryExpression(p)) {
        const k = p.operatorToken.kind; const other = p.left === e ? p.right : p.left;
        if (COMPARE.has(k)) {
          const l = litOf(other);
          if (l) { addLit(node.compares, l.v); if (typeof l.v === 'number') node.numeric = true; else if (typeof l.v === 'string') node.string = true; }
          else { const ot = tOf(other); if (ot && !isAnyT(ot)) { if (ot.flags & TF.NumberLike) node.numeric = true; else if (ot.flags & TF.StringLike) node.string = true; } }
          if ([K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken].includes(k) && !(l && typeof l.v === 'string')) node.numeric = true;
          return;
        }
        if (ARITH.has(k)) { node.numeric = true; return; }
        if (k === K.PlusToken) { const ot = tOf(other); if (ot && (ot.flags & TF.NumberLike) && !isAnyT(ot)) node.numeric = true; return; }
        if (k === K.AmpersandAmpersandToken || k === K.BarBarToken) { if (p.left === e) node.truthy = true; return; }
        if (k === K.QuestionQuestionToken) { if (p.left === e) addLit(node.compares, UNDEF); return; }
        if (k === K.InKeyword && p.right === e) { const l = litOf(p.left); if (l && typeof l.v === 'string') field(node, l.v).inTested = true; return; }
        return;
      }
      if (ts.isPrefixUnaryExpression(p)) { if (p.operator === K.ExclamationToken) node.truthy = true; else if (p.operator === K.MinusToken || p.operator === K.PlusToken) node.numeric = true; return; }
      if ((ts.isIfStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p)) && p.expression === e) { node.truthy = true; return; }
      if (ts.isConditionalExpression(p) && p.condition === e) { node.truthy = true; return; }
      if (ts.isTypeOfExpression(p)) { const b = up(p).parent; if (b && ts.isBinaryExpression(b) && COMPARE.has(b.operatorToken.kind)) { const l = litOf(b.left === up(p) ? b.right : b.left); if (l && typeof l.v === 'string') addLit(node.typeofs, l.v); } return; }
      if (ts.isForOfStatement(p) && p.expression === e) { elemOf(node); return; }
      if (ts.isSwitchStatement(p) && p.expression === e) { for (const c of p.caseBlock.clauses) if (ts.isCaseClause(c)) { const l = litOf(c.expression); if (l) { addLit(node.compares, l.v); if (typeof l.v === 'string') node.string = true; else if (typeof l.v === 'number') node.numeric = true; } } return; }
      if (ts.isSpreadElement(p) && p.parent && ts.isArrayLiteralExpression(p.parent)) { node.array = true; return; }
    }
    const w = (n) => {
      if (ts.isIdentifier(n) && n !== declName && symOf(n) === sym) {
        refs++;
        const e = up(n); const p = e.parent;
        if (p && ts.isBinaryExpression(p) && p.left === e && p.operatorToken.kind === K.EqualsToken) assigns.push(p.right);
        else if (p && ts.isShorthandPropertyAssignment(p)) { /* handed into a record: says nothing of its type */ }
        else classify(n, tree);
      }
      ts.forEachChild(n, w);
    };
    if (scope) w(scope);
    return { tree, passes, assigns, refs };
  }

  // the kind words of a usage node, and its type text; conflicts collected with their path
  function kindsOf(n) {
    const lits = n.compares.filter((v) => v !== null && !isUndef(v));
    const ks = new Set();
    if (n.string || lits.some((v) => typeof v === 'string') || n.typeofs.includes('string')) ks.add('string');
    if (n.numeric || lits.some((v) => typeof v === 'number') || n.typeofs.includes('number')) ks.add('number');
    if (lits.includes(true) || n.typeofs.includes('boolean')) ks.add('boolean');
    if (n.array || n.elem) ks.add('array');
    if (Object.keys(n.fields).length || (n.typeofs.includes('object') && !(n.array || n.elem))) ks.add('record');
    if (n.called != null || n.typeofs.includes('function')) ks.add('function');
    const lenOnly = !!n.len && !ks.has('string') && !ks.has('array');
    if (lenOnly) ks.add('array');
    return { ks, lenOnly };
  }
  function shapeOf(n, path, depth, conflicts, evidence) {
    const { ks, lenOnly } = kindsOf(n);
    const guarded = n.typeofs.length >= 2; // `typeof x === "a" ... typeof x === "b"`: the code tests a union itself
    if (ks.size > 1 && !guarded) conflicts.push(`${path} is used as ${[...ks].join(' and as ')}`);
    const parts = [];
    for (const k of ks) {
      if (k === 'string' || k === 'number' || k === 'boolean') parts.push(k);
      else if (k === 'array') { const el = n.elem && depth < 3 ? shapeOf(n.elem, `${path}[i]`, depth + 1, conflicts, evidence) : 'unknown'; parts.push(/[|&=]/.test(el) ? `(${el})[]` : `${el}[]`); if (lenOnly) evidence.push(`${path}.length is read`); else if (n.elem) evidence.push(`${path} is indexed or iterated`); else evidence.push(`${path} is used as an array`); }
      else if (k === 'record') {
        const keys = Object.keys(n.fields);
        if (!keys.length || depth >= 3) { parts.push('object'); continue; }
        const fields = keys.map((f) => {
          const c = n.fields[f]; const id = /^[A-Za-z_$][\w$]*$/.test(f) ? f : JSON.stringify(f);
          const opt = c.inTested || c.compares.some(isUndef);
          return `${id}${opt ? '?' : ''}: ${shapeOf(c, `${path}.${f}`, depth + 1, conflicts, evidence)}`;
        });
        parts.push(`{ ${fields.join('; ')} }`);
      } else if (k === 'function') { const ar = n.called ?? 0; parts.push(`(${Array.from({ length: ar }, (_, i) => `a${i}: unknown`).join(', ')}) => unknown`); evidence.push(`${path} is called`); }
    }
    const lits = n.compares.filter((v) => v !== null && !isUndef(v));
    if (lits.length) evidence.push(`${path} is compared to ${lits.slice(0, 3).map((v) => JSON.stringify(v)).join(', ')}`);
    else if (ks.has('number') && !ks.has('array')) evidence.push(`${path} takes arithmetic or a numeric compare`);
    else if (ks.has('string') && !ks.has('array')) evidence.push(`${path} takes a string method or compare`);
    let text = parts.length ? parts.join(' | ') : 'unknown';
    if (parts.length > 1 && parts.some((p) => p.includes('=>'))) text = parts.map((p) => (p.includes('=>') ? `(${p})` : p)).join(' | ');
    if (text !== 'unknown') {
      if (n.compares.includes(null)) text += ' | null';
      if (n.compares.some(isUndef) || (n.truthy && !ks.has('boolean'))) text += ' | undefined';
    }
    return text;
  }
  // the kind words of a checker type, for comparing a caller's argument or a callee's parameter with the uses
  function typeKinds(t) {
    const ks = new Set();
    for (const x of t.flags & TF.Union ? t.types : [t]) {
      if (x.flags & (TF.Null | TF.Undefined | TF.Void)) continue;
      if (x.flags & TF.StringLike) ks.add('string');
      else if (x.flags & (TF.NumberLike | TF.BigIntLike)) ks.add('number');
      else if (x.flags & TF.BooleanLike) ks.add('boolean');
      else if (isArrayLike(checker, x)) ks.add('array');
      else if (checker.getSignaturesOfType(x, ts.SignatureKind.Call).length) ks.add('function');
      else if (x.flags & (TF.Object | TF.Intersection | TF.NonPrimitive)) ks.add('record');
      else ks.add('other');
    }
    return ks;
  }
  // whether a type covers the uses: every use kind is one of its kinds, every field read is declared on it
  function covers(t, n, at) {
    const { ks, lenOnly } = kindsOf(n); const tk = typeKinds(t);
    for (const k of ks) if (!tk.has(k) && !(k === 'array' && lenOnly && tk.has('string')) && !(k === 'record' && tk.has('array'))) return `the uses need ${k} and it is ${typeText(t, at)}`;
    if (ks.has('record')) for (const f of Object.keys(n.fields)) {
      const ok = (t.flags & TF.Union ? t.types : [t]).some((x) => !!checker.getPropertyOfType(checker.getApparentType(x), f) || !!checker.getIndexInfoOfType(x, ts.IndexKind.String));
      if (!ok) return `it is ${typeText(t, at)}, which has no .${f}`;
    }
    return null;
  }

  // one finding: label, precondition, advice text, the annotation fix
  function report(node, kind, name, t, written, unitName, ev) {
    const how = written ? 'written' : 'inferred';
    const tt = t.flags & TF.Unknown ? 'unknown' : 'any';
    let label, precondition = null, proposal = null, adviceText, msg;
    if (ev.conflicts.length) {
      label = 'migration';
      msg = `\`${name}\` is ${tt} (${how}); its evidence conflicts: ${ev.conflicts.slice(0, 2).join('; ')}`;
      adviceText = `the evidence disagrees (${ev.conflicts.slice(0, 2).join('; ')}); a person decides the type of ${name}`;
    } else if (ev.proposal && ev.proposal !== 'unknown') {
      label = 'conditional'; proposal = ev.proposal;
      precondition = `every use of ${name} is covered by this type: ${ev.evidence.slice(0, 4).join('; ')}`;
      msg = `\`${name}\` is ${tt} (${how}); its uses say ${short(proposal, 120)}`;
      adviceText = `annotate ${name} as ${proposal}`;
    } else if (ev.guarded) {
      label = 'migration';
      msg = `\`${name}\` is ${tt} (${how}); the code tests its type at run time (${ev.evidence[0]}): no one type is proposed`;
      adviceText = `keep the test and the ${tt}, or write the union of the types ${name} may hold`;
    } else if (kind === 'return') {
      label = 'migration';
      const why = ev.partial ? `${ev.partial} returned value(s) typed any beside typed ones` : ev.refs ? 'no returned value has a type' : 'nothing is returned';
      msg = `\`${name}\` is ${tt} (${how}); no evidence: ${why}`;
      adviceText = `no evidence: ${why}; write the type its callers mean`;
    } else {
      label = 'migration';
      const why = ev.refs ? `no use of ${name} fixes a type` : `${name} is never read`;
      msg = `\`${name}\` is ${tt} (${how}); no evidence: ${why}`;
      adviceText = `no evidence: ${why}; write the type its callers mean`;
    }
    const pos = node.getStart(sf), end = node.getEnd();
    const f = { file, line: lineOf(sf, pos), col: colOf(sf, pos), endLine: lineOf(sf, end), endCol: colOf(sf, end), rule: 'any-type', msg, text: sf.text.slice(pos, end).slice(0, 200), kind, name, typed: tt, how, proposal, evidence: ev.evidence, ...(ev.conflicts.length ? { conflicts: ev.conflicts } : {}) };
    if (ev.guarded) f.guarded = true;
    if (proposal && ev.fix && !proposal.includes('import(')) f.fix = { line: lineOf(sf, ev.fix.start), col: colOf(sf, ev.fix.start), endLine: lineOf(sf, ev.fix.end), endCol: colOf(sf, ev.fix.end), text: ev.fix.text(proposal) };
    const u = unitSpans.find(([, a, b]) => a <= f.line && f.line <= b); f.unit = u ? u[0] : unitName;
    f.label = label; f.labelDecided = true; if (precondition) f.precondition = precondition;
    f.advice = `${labelTag(label, precondition)} ${adviceText}`;
    out.push(f);
  }
  // where the annotation goes: after the name (and its `?`/`!`), or over a written type
  const annotateAt = (d) => {
    if (d.type) return { start: d.type.getStart(sf), end: d.type.getEnd(), text: (p) => p };
    if (ts.isVariableDeclaration(d) && d.parent?.parent && (ts.isForOfStatement(d.parent.parent) || ts.isForInStatement(d.parent.parent))) return null; // a for-of binding takes no annotation
    const after = d.exclamationToken ?? d.questionToken ?? d.name;
    return { start: after.getEnd(), end: after.getEnd(), text: (p) => `: ${p}` };
  };
  // candidate types from outside the uses (callers, callees, assignments): a union when they agree with the uses
  function combine(tree, candidates0, at, base) {
    const conflicts = [], evidence = [];
    // a caller passing `undefined` or `null` says only that the value may be absent
    const nullish = (t) => (t.flags & TF.Union ? t.types : [t]).every((x) => !!(x.flags & (TF.Null | TF.Undefined | TF.Void)));
    const absent = candidates0.filter((c) => nullish(c.type));
    const candidates = candidates0.filter((c) => !nullish(c.type));
    const fromUses = shapeOf(tree, base, 0, conflicts, evidence);
    const texts = [];
    for (const c of candidates) {
      const why = covers(c.type, tree, at);
      if (why) conflicts.push(`${c.where}: ${why}`);
      else { const s = typeText(c.type, at); if (!texts.includes(s)) texts.push(s); evidence.push(`${c.where}: ${short(s, 50)}`); }
    }
    // two outside sources of different kinds that no use separates: a caller and a callee disagree
    const callers = candidates.filter((c) => c.side === 'in'), callees = candidates.filter((c) => c.side === 'out');
    for (const a of callers) for (const b of callees) { const ka = typeKinds(a.type), kb = typeKinds(b.type); if (ka.size && kb.size && ![...ka].some((k) => kb.has(k))) conflicts.push(`${a.where} gives ${typeText(a.type, at)} but ${b.where} expects ${typeText(b.type, at)}`); }
    const outside = callers.length ? callers : candidates; // what flows in decides; a callee only narrows
    const outsideTexts = [...new Set(outside.map((c) => typeText(c.type, at)))].filter((s) => texts.includes(s));
    // an anonymous object type (a fresh literal at the call) is evidence that the uses fit, not a type to write: the
    // uses give the shape, the callers confirm it
    const named = outside.every((c) => !anonymous(c.type) && !typeText(c.type, at).includes('import('));
    // a value the code tests at run time (typeof, Array.isArray, instanceof): the test says it can be other things,
    // and the uses after it are narrowed; no one type is proposed, whatever flows in
    if (tree.typeofs.length) return { proposal: null, conflicts: [], evidence: [`${base} is tested with ${tree.typeofs.map((x) => (x === 'Array.isArray' || x === 'instanceof' ? x : `typeof ${JSON.stringify(x)}`)).join(', ')}`], guarded: true };
    let proposal = conflicts.length ? null : outsideTexts.length && named ? outsideTexts.join(' | ') : fromUses;
    if (proposal && proposal !== 'unknown' && absent.length) {
      for (const c of absent) evidence.push(`${c.where}: ${typeText(c.type, at)}`);
      for (const word of ['undefined', 'null']) if (absent.some((c) => typeText(c.type, at).includes(word)) && !proposal.split(' | ').includes(word)) proposal += ` | ${word}`;
    }
    return { proposal, conflicts, evidence: evidence.length ? evidence : [] };
  }
  const anonymous = (t, depth = 0) => depth > 3 || (t.flags & TF.Union ? t.types : [t]).some((x) => {
    if (x.flags & TF.Never) return true;
    if (isArrayLike(checker, x)) return (checker.getTypeArguments?.(x) ?? []).some((e) => anonymous(e, depth + 1));
    return !!(x.flags & TF.Object) && !x.aliasSymbol && (!x.symbol || !!(x.symbol.flags & (ts.SymbolFlags.ObjectLiteral | ts.SymbolFlags.TypeLiteral)));
  });
  // the reason of a rejected promise, `p.catch((e) => ...)` or `p.then(f, (e) => ...)`: any by the language, as a catch binding
  const rejectionHandler = (param) => {
    const fn = param.parent; if (fn.parameters[0] !== param) return false;
    let at = fn; while (at.parent && ts.isParenthesizedExpression(at.parent)) at = at.parent;
    const c = at.parent; if (!c || !ts.isCallExpression(c) || !ts.isPropertyAccessExpression(c.expression)) return false;
    const m = c.expression.name.text;
    return (m === 'catch' && c.arguments[0] === at) || (m === 'then' && c.arguments[1] === at);
  };
  const nonAny = (t) => !!t && !isAnyT(t) && !(t.flags & TF.Never);
  const calleeCandidates = (passes) => {
    const cs = [];
    for (const { call, index } of passes) {
      let d = null; try { d = checker.getResolvedSignature(call)?.declaration ?? null; } catch { d = null; }
      if (!d || d.getSourceFile?.() !== sf || !d.parameters?.[index]) continue; // a same-file callee only
      const p = d.parameters[index]; if (p.dotDotDotToken) continue;
      const pt = tOf(p.name); if (nonAny(pt)) cs.push({ type: pt, where: `passed to ${short(call.expression.getText(sf), 30)} at line ${lineOf(sf, call.getStart(sf))}`, side: 'out' });
    }
    return cs;
  };

  // same-file calls of each unit, for the caller evidence of its parameters
  const callsOf = new Map();
  const unitDecls = new Map([...units.values()].map((u) => [u.fn, u]));
  const collectCalls = (n) => {
    if (ts.isCallExpression(n) || ts.isNewExpression(n)) { let d = null; try { d = checker.getResolvedSignature(n)?.declaration ?? null; } catch { d = null; } const u = d && unitDecls.get(d); if (u) { if (!callsOf.has(u)) callsOf.set(u, []); callsOf.get(u).push(n); } }
    ts.forEachChild(n, collectCalls);
  };
  collectCalls(sf);
  const usageMemo = new Map();
  const usageOf = (u) => { if (!usageMemo.has(u.name)) { let r = null; try { r = usage(sf, u.name, checker); } catch { r = null; } usageMemo.set(u.name, r); } return usageMemo.get(u.name); };

  const inRange = (n) => overlaps(sf, n, ranges);
  const seenDecl = new Set();
  for (const u of units.values()) {
    if (!inRange(u.node) || !u.fn || !u.body) continue; // a declaration without a body has no uses
    const scope = u.fn;
    // parameters of the unit: usage.mjs's tree, callers' arguments, callees' parameters
    u.params.forEach((p, i) => {
      if (ts.isIdentifier(p.name) && p.name.text === 'this') return;
      const t = tOf(p.name); if (!isAnyT(t) || envDecl(p)) return;
      seenDecl.add(p);
      const sym = ts.isIdentifier(p.name) ? symOf(p.name) : null;
      const r = sym ? readsOf(sym, scope, p.name) : { tree: newNode(), passes: [], assigns: [], refs: 0 };
      const tree = mergeNodes(usageOf(u)?.params[i]?.node ?? null, r.tree);
      const name = ts.isIdentifier(p.name) ? p.name.text : short(p.name.getText(sf), 40);
      const cands = [];
      for (const c of callsOf.get(u) ?? []) { const a = c.arguments?.[i]; if (!a || ts.isSpreadElement(a)) continue; const at = tOf(a); if (nonAny(at)) cands.push({ type: at, where: `a caller at line ${lineOf(sf, c.getStart(sf))} passes`, side: 'in' }); }
      cands.push(...calleeCandidates(r.passes));
      const ev = combine(tree, cands, p, name);
      const used = r.refs || Object.keys(tree.fields).length || tree.elem || tree.len;
      report(p.name, 'parameter', name, t, !!p.type, u.name, { ...ev, refs: used ? 1 : 0, fix: annotateAt(p) });
    });
    // locals and the parameters of nested functions: the reader above, assignments, callees
    const walk = (n) => {
      if (ts.isVariableDeclaration(n) && !(n.parent && ts.isCatchClause(n.parent))) site(n, 'local');
      else if (ts.isParameter(n) && n.parent !== u.fn && !(ts.isIdentifier(n.name) && n.name.text === 'this') && !rejectionHandler(n)) site(n, 'parameter');
      ts.forEachChild(n, walk);
    };
    const site = (d, kind) => {
      if (seenDecl.has(d)) return; seenDecl.add(d);
      const t = tOf(d.name); if (!isAnyT(t) || envDecl(d)) return;
      const name = ts.isIdentifier(d.name) ? d.name.text : short(d.name.getText(sf), 40);
      const sym = ts.isIdentifier(d.name) ? symOf(d.name) : null;
      const r = sym ? readsOf(sym, scope, d.name) : { tree: newNode(), passes: [], assigns: [], refs: 0 };
      const cands = [];
      const inits = [...(d.initializer ? [d.initializer] : []), ...r.assigns];
      for (const e of inits) { const et = tOf(e); if (nonAny(et)) cands.push({ type: et, where: `assigned at line ${lineOf(sf, e.getStart(sf))}`, side: 'in' }); }
      cands.push(...calleeCandidates(r.passes));
      const ev = combine(r.tree, cands, d, name);
      report(d.name, kind, name, t, !!d.type, u.name, { ...ev, refs: r.refs, fix: annotateAt(d) });
    };
    if (u.body) walk(u.body);
    for (const p of u.params) if (p.initializer) walk(p.initializer);
    // the return: the types of the returned values
    if (!u.isCtor && u.accessor !== 'set') {
      let sig = null; try { sig = checker.getSignatureFromDeclaration(u.fn); } catch { sig = null; }
      const rt = sig?.getReturnType(); const inner = rt && rt.symbol?.name === 'Promise' ? checker.getTypeArguments(rt)[0] : rt;
      if (isAnyT(inner) && !(u.fn.type && mentionsEnv(u.fn.type))) {
        const rets = [];
        const w = (n) => { if (ts.isFunctionLike(n) && n !== u.fn) return; if (ts.isReturnStatement(n) && n.expression) rets.push(n.expression); ts.forEachChild(n, w); };
        if (u.body && ts.isBlock(u.body)) w(u.body); else if (u.body) rets.push(u.body);
        if (!rets.some((e) => mentionsEnv(e))) {
          const evidence = [], texts = []; // an async unit returns the awaited value
          let opaque = 0;
          for (const e of rets) { const et0 = tOf(e); const et = u.isAsync && et0 ? (checker.getAwaitedType(et0) ?? et0) : et0; if (nonAny(et)) { const s = typeText(et, u.fn); if (!texts.includes(s)) texts.push(s); evidence.push(`returns ${short(s, 50)} at line ${lineOf(sf, e.getStart(sf))}`); } else opaque++; }
          if (opaque && texts.length) evidence.push(`${opaque} return(s) typed any`);
          const proposal = texts.length && !opaque ? texts.join(' | ') : null;
          const wrap = (p) => (u.isAsync && !(u.fn.type && !(u.fn.type.getText(sf).startsWith('Promise')))) ? `Promise<${p}>` : p;
          const close = u.fn.getChildren(sf).find((c) => c.kind === K.CloseParenToken);
          const fix = u.fn.type ? { start: u.fn.type.getStart(sf), end: u.fn.type.getEnd(), text: (p) => wrap(p) } : close ? { start: close.getEnd(), end: close.getEnd(), text: (p) => `: ${wrap(p)}` } : null;
          const at = u.fn.name ?? (ts.isVariableStatement(u.node) ? u.node.declarationList.declarations[0].name : u.fn);
          report(at, 'return', `the return of ${u.name}`, inner, !!u.fn.type, u.name, { proposal: proposal && wrap(proposal), conflicts: [], evidence, refs: rets.length, partial: texts.length ? opaque : 0, fix: fix && { ...fix, text: () => fix.text(proposal) } });
        }
      }
    }
  }
  // fields of a class: what its methods read off `this.<field>` and what they assign to it
  for (const st of sf.statements) {
    if (!ts.isClassDeclaration(st) || !st.name || !inRange(st)) continue;
    const methods = [...units.values()].filter((m) => m.cls === st);
    for (const m of st.members) {
      if (!ts.isPropertyDeclaration(m) || !m.name || !ts.isIdentifier(m.name)) continue;
      const t = tOf(m.name); if (!isAnyT(t) || envDecl(m)) continue;
      const name = m.name.text;
      let tree = null; const cands = [];
      for (const mu of methods) { const us = usageOf(mu); const fnode = us?.this?.fields[name]; if (fnode) tree = mergeNodes(tree, fnode); }
      const w = (n) => { if (ts.isBinaryExpression(n) && n.operatorToken.kind === K.EqualsToken && ts.isPropertyAccessExpression(n.left) && n.left.expression.kind === K.ThisKeyword && n.left.name.text === name) { const et = tOf(n.right); if (nonAny(et)) cands.push({ type: et, where: `assigned at line ${lineOf(sf, n.getStart(sf))}`, side: 'in' }); } ts.forEachChild(n, w); };
      w(st);
      if (m.initializer) { const et = tOf(m.initializer); if (nonAny(et)) cands.push({ type: et, where: `initialised at line ${lineOf(sf, m.initializer.getStart(sf))}`, side: 'in' }); }
      tree ??= newNode();
      const ev = combine(tree, cands, m, `this.${name}`);
      const used = Object.keys(tree.fields).length || tree.elem || tree.len || tree.truthy || tree.compares.length || tree.called != null || cands.length;
      report(m.name, 'field', name, t, !!m.type, null, { ...ev, refs: used ? 1 : 0, fix: annotateAt(m) });
    }
  }
  return out;
}

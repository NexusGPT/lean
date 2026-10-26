#!/usr/bin/env node
// lean concept census: what the language is used for in a repository, independent of the lint.
//   node concepts.mjs <repo-root> [<repo-root> ...] [--out concepts.json]
// Walks the same files as census.mjs, parses each without a project (syntax only), and for every unit (a top-level
// function, an arrow const, a class method) records which syntax kinds and which semantic domains its body uses.
// The report counts UNITS per kind and per domain, so that a concept's weight is the number of functions a faithful
// reading of it would admit. Read-only.
import fs from 'node:fs';
import path from 'node:path';
import { ts } from './common.mjs';

const K = ts.SyntaxKind;
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git', 'out', 'generated', '__generated__', 'storybook-static', 'vendor', '.turbo', '.cache']);
const SKIP_FILE = /\.(test|spec|stories|d|e2e|cy)\.(ts|tsx|mts)$|(^|\/)(tests?|__tests__|__mocks__|e2e|fixtures?|__fixtures__|stories|cypress|playwright)(\/|$)/;
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name) && !e.name.startsWith('.')) yield* walk(path.join(dir, e.name)); continue; }
    if (/\.(ts|tsx|mts)$/.test(e.name)) { const p = path.join(dir, e.name); if (!SKIP_FILE.test(p)) yield p; }
  }
}

// semantic domains: a predicate on a node, named for the reading it needs
const GLOBAL_EFFECTS = new Set(['console', 'process', 'window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'fetch', 'setTimeout', 'setInterval', 'setImmediate', 'clearTimeout', 'clearInterval', 'requestAnimationFrame', 'performance', 'crypto', 'globalThis', 'global', 'Buffer', 'location', 'history', 'alert', 'confirm', 'prompt', 'XMLHttpRequest', 'WebSocket', 'Worker', 'Intl', 'queueMicrotask', 'structuredClone', 'indexedDB', 'caches', 'AbortController', 'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder', 'Blob', 'File', 'FormData', 'Headers', 'Request', 'Response', 'Event', 'CustomEvent', 'Image', 'Audio', 'MutationObserver', 'IntersectionObserver', 'ResizeObserver']);
const MUT_METHODS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'add', 'delete', 'clear']);
const text = (n, sf) => n.getText(sf);
const rootOf = (x) => { while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isNonNullExpression(x) || ts.isParenthesizedExpression(x) || ts.isCallExpression(x)) x = x.expression; return x; };

function domainsOf(unit, sf) {
  const out = new Set();
  const params = new Set(unit.params.map((p) => (ts.isIdentifier(p.name) ? p.name.text : null)).filter(Boolean));
  const add = (d) => out.add(d);
  const isAssign = (n) => ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment;
  let fnDepth = 0;
  const declaredHere = new Set();
  const w = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) declaredHere.add(n.name.text);
    // control and exceptions
    if (ts.isTryStatement(n)) { add(n.catchClause ? 'try/catch' : 'try/finally only'); if (n.finallyBlock) add('finally block'); }
    if (ts.isThrowStatement(n)) add('throw');
    if (ts.isLabeledStatement(n)) add('labelled statement');
    if (ts.isDoStatement(n)) add('do-while');
    if (ts.isWhileStatement(n)) add('while');
    if (ts.isForInStatement(n)) add('for-in');
    if (ts.isForOfStatement(n)) add(n.awaitModifier ? 'for await' : 'for-of');
    if (ts.isForStatement(n)) add('for (;;)');
    if (ts.isSwitchStatement(n)) add('switch');
    if (ts.isConditionalExpression(n)) add('?:');
    // async and scheduling
    if (ts.isAwaitExpression(n)) add('await');
    if (ts.isYieldExpression(n)) add('yield');
    if ((ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n)) && n.asteriskToken) add('generator');
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Promise') add(`Promise.${n.expression.name.text}`);
    if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Promise') add('new Promise');
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ['then', 'catch', 'finally'].includes(n.expression.name.text)) add('.then/.catch chain');
    // functions and closures
    if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) { add('nested function value'); if (n.modifiers?.some((m) => m.kind === K.AsyncKeyword)) add('async callback'); }
    if (ts.isFunctionDeclaration(n) && n !== unit.node) add('nested function declaration');
    if (fnDepth > 0 && isAssign(n) && ts.isIdentifier(n.left) && !declaredHere.has(n.left.text)) add('closure assigns outer variable');
    if (fnDepth > 0 && isAssign(n) && !ts.isIdentifier(n.left) && ts.isIdentifier(rootOf(n.left))) add('closure mutates outer object');
    // mutation and references
    if (isAssign(n) && (ts.isPropertyAccessExpression(n.left) || ts.isElementAccessExpression(n.left))) { const r = rootOf(n.left); if (r.kind === K.ThisKeyword) add('assigns a field of this'); else if (ts.isIdentifier(r) && params.has(r.text)) add('mutates a parameter'); else if (ts.isIdentifier(r)) add('mutates a local object'); else add('mutates a computed target'); }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MUT_METHODS.has(n.expression.name.text)) { const r = rootOf(n.expression.expression); if (r.kind === K.ThisKeyword) add('mutating method on a field of this'); else if (ts.isIdentifier(r) && params.has(r.text)) add('mutating method on a parameter'); else add('mutating method on a local or result'); }
    if (ts.isDeleteExpression(n)) add('delete property');
    if (ts.isBinaryExpression(n) && (n.operatorToken.kind === K.EqualsEqualsEqualsToken || n.operatorToken.kind === K.ExclamationEqualsEqualsToken)) add('===');
    if (ts.isBinaryExpression(n) && (n.operatorToken.kind === K.EqualsEqualsToken || n.operatorToken.kind === K.ExclamationEqualsToken)) add('== loose equality');
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name) && (ts.isIdentifier(n.initializer) || ts.isPropertyAccessExpression(n.initializer))) add('local bound to another name (alias)');
    // classes and objects
    if (n.kind === K.ThisKeyword) add('this');
    if (n.kind === K.SuperKeyword) add('super');
    if (ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n)) add('getter/setter');
    if (ts.isNewExpression(n)) add('new');
    if (ts.isClassExpression(n)) add('class expression');
    if (ts.isPrivateIdentifier(n)) add('#private field');
    if (ts.isPropertyAccessExpression(n) && ['prototype', '__proto__', 'constructor'].includes(n.name.text)) add('prototype access');
    if (ts.isIdentifier(n) && ['Proxy', 'Reflect'].includes(n.text)) add('Proxy/Reflect');
    if (ts.isIdentifier(n) && n.text === 'Symbol') add('Symbol');
    if (ts.isIdentifier(n) && n.text === 'arguments') add('arguments object');
    if (ts.isObjectLiteralExpression(n) && n.properties.some((p) => ts.isMethodDeclaration(p) || ts.isGetAccessorDeclaration(p) || ts.isSetAccessorDeclaration(p))) add('object literal with methods');
    if (ts.isObjectLiteralExpression(n) && n.properties.some((p) => ts.isPropertyAssignment(p) && ts.isComputedPropertyName(p.name))) add('computed property name');
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Object') add(`Object.${n.expression.name.text}`);
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Array') add(`Array.${n.expression.name.text}`);
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'JSON') add(`JSON.${n.expression.name.text}`);
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Math') add(`Math.${n.expression.name.text}`);
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && ['Number', 'String', 'Boolean'].includes(n.expression.expression.text)) add(`${n.expression.expression.text}.${n.expression.name.text}`);
    // dynamic features
    if (ts.isElementAccessExpression(n) && !ts.isNumericLiteral(n.argumentExpression) && !ts.isStringLiteral(n.argumentExpression)) add('computed member access');
    if (ts.isTypeOfExpression(n)) add('typeof');
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === K.InstanceOfKeyword) add('instanceof');
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === K.InKeyword) add('in');
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['eval', 'Function'].includes(n.expression.text)) add('eval');
    if (ts.isTaggedTemplateExpression(n)) add('tagged template');
    if (ts.isRegularExpressionLiteral(n)) add('regex literal');
    if (ts.isSpreadElement(n)) add('spread in call or array');
    if (ts.isSpreadAssignment(n)) add('spread in object');
    if (ts.isParameter(n) && n.dotDotDotToken) add('rest parameter');
    if (ts.isBindingElement(n) && n.dotDotDotToken) add('rest pattern');
    if (ts.isBindingElement(n) && n.initializer) add('destructuring default');
    if (ts.isParameter(n) && n.initializer) add('default parameter');
    if (ts.isObjectBindingPattern(n) || ts.isArrayBindingPattern(n)) add('destructuring');
    if (ts.isPropertyAccessExpression(n) && n.questionDotToken) add('optional chaining');
    if (ts.isCallExpression(n) && n.questionDotToken) add('optional call');
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === K.QuestionQuestionToken) add('??');
    if (ts.isNonNullExpression(n)) add('x!');
    if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) add('as cast');
    if (ts.isSatisfiesExpression && ts.isSatisfiesExpression(n)) add('satisfies');
    if (ts.isTemplateExpression(n)) add('template string');
    if (ts.isVoidExpression(n)) add('void');
    if (ts.isCommaListExpression(n) || (ts.isBinaryExpression(n) && n.operatorToken.kind === K.CommaToken)) add('comma operator');
    if (ts.isBinaryExpression(n) && [K.AmpersandToken, K.BarToken, K.CaretToken, K.LessThanLessThanToken, K.GreaterThanGreaterThanToken, K.GreaterThanGreaterThanGreaterThanToken].includes(n.operatorToken.kind)) add('bitwise');
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === K.AsteriskAsteriskToken) add('**');
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === K.SlashToken) add('/ division');
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === K.PercentToken) add('% modulo');
    if (ts.isNumericLiteral(n) && /\./.test(n.text)) add('float literal');
    if (ts.isBigIntLiteral(n)) add('bigint');
    if (ts.isPrefixUnaryExpression(n) && n.operator === K.PlusToken) add('unary + coercion');
    if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken) && !(n.parent && ts.isExpressionStatement(n.parent)) && !(n.parent && ts.isForStatement(n.parent))) add('++ as a value');
    if (isAssign(n) && !(n.parent && (ts.isExpressionStatement(n.parent) || ts.isForStatement(n.parent)))) add('assignment as a value');
    if (ts.isBinaryExpression(n) && (n.operatorToken.kind === K.LessThanToken || n.operatorToken.kind === K.GreaterThanToken || n.operatorToken.kind === K.LessThanEqualsToken || n.operatorToken.kind === K.GreaterThanEqualsToken)) add('< > comparison');
    if (ts.isBinaryExpression(n) && (n.operatorToken.kind === K.AmpersandAmpersandToken || n.operatorToken.kind === K.BarBarToken) && n.parent && !ts.isIfStatement(n.parent) && !ts.isConditionalExpression(n.parent) && !(ts.isBinaryExpression(n.parent) && [K.AmpersandAmpersandToken, K.BarBarToken].includes(n.parent.operatorToken.kind)) && !(ts.isPrefixUnaryExpression(n.parent)) && !ts.isWhileStatement(n.parent) && !ts.isForStatement(n.parent)) add('&& || as a value');
    // world
    if (ts.isIdentifier(n) && GLOBAL_EFFECTS.has(n.text) && !(n.parent && ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) add(`global ${n.text}`);
    if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Date') add('new Date');
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Date') add(`Date.${n.expression.name.text}`);
    if (ts.isCallExpression(n) && text(n.expression, sf) === 'Math.random') add('Math.random');
    if (ts.isImportCall && ts.isCallExpression(n) && n.expression.kind === K.ImportKeyword) add('dynamic import()');
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'require') add('require()');
    // JSX
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n)) add('JSX element');
    if (ts.isJsxFragment(n)) add('JSX fragment');
    if (ts.isJsxSpreadAttribute(n)) add('JSX spread attribute');
    if (ts.isJsxAttribute(n) && n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression && (ts.isArrowFunction(n.initializer.expression) || ts.isFunctionExpression(n.initializer.expression))) add('JSX handler attribute');
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && /^use[A-Z]/.test(n.expression.text)) add('React hook call');
    // types and decorators
    if (ts.isDecorator(n)) add('decorator');
    if (ts.isTypePredicateNode(n)) add('type predicate');
    if (ts.isTypeParameterDeclaration(n)) add('generic parameter');
    if (ts.isEnumDeclaration(n)) add('enum');
    if (ts.isModuleDeclaration(n)) add('namespace');
    if (ts.isAsExpression(n) && n.type && ts.isTypeReferenceNode(n.type) && n.type.typeName.getText(sf) === 'const') add('as const');
    const nested = ts.isArrowFunction(n) || ts.isFunctionExpression(n) || (ts.isFunctionDeclaration(n) && n !== unit.node);
    if (nested) fnDepth++;
    ts.forEachChild(n, w);
    if (nested) fnDepth--;
  };
  w(unit.body);
  // unit-level
  if (unit.node.modifiers?.some((m) => m.kind === K.AsyncKeyword)) add('async unit');
  if (unit.kind === 'method') { add('class method'); if (unit.isStatic) add('static method'); if (unit.cls.heritageClauses?.length) add('method of a class that extends'); }
  if (unit.node.typeParameters?.length) add('generic unit');
  if (unit.node.parameters.some((p) => !ts.isIdentifier(p.name))) add('destructured parameter');
  return out;
}

function unitsOf(sf) {
  const out = [];
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.body) out.push({ kind: 'function', node: st, body: st.body, params: st.parameters });
    else if (ts.isVariableStatement(st)) { for (const d of st.declarationList.declarations) if (d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)) && d.initializer.body) out.push({ kind: 'function', node: d.initializer, body: d.initializer.body, params: d.initializer.parameters }); }
    else if (ts.isClassDeclaration(st)) { for (const m of st.members) if (ts.isMethodDeclaration(m) && m.body) out.push({ kind: 'method', node: m, body: m.body, params: m.parameters, cls: st, isStatic: !!m.modifiers?.some((x) => x.kind === K.StaticKeyword) }); }
    else if (ts.isExportAssignment(st) && st.expression && (ts.isArrowFunction(st.expression) || ts.isFunctionExpression(st.expression)) && st.expression.body) out.push({ kind: 'function', node: st.expression, body: st.expression.body, params: st.expression.parameters });
  }
  return out;
}

export function concepts(root) {
  const kinds = new Map(); const domains = new Map();
  let units = 0, files = 0;
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    files++;
    for (const u of unitsOf(sf)) {
      units++;
      const seen = new Set();
      const w = (n) => { seen.add(K[n.kind]); ts.forEachChild(n, w); };
      w(u.body);
      for (const k of seen) kinds.set(k, (kinds.get(k) ?? 0) + 1);
      for (const d of domainsOf(u, sf)) domains.set(d, (domains.get(d) ?? 0) + 1);
    }
  }
  const sortDesc = (m) => Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]));
  return { root, files, units, kinds: sortDesc(kinds), domains: sortDesc(domains) };
}

if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const out = a.includes('--out') ? a[a.indexOf('--out') + 1] : null;
  const roots = a.filter((x, i) => !x.startsWith('--') && a[i - 1] !== '--out');
  const reports = roots.map((r) => { const c = concepts(r); console.error(`${r}: ${c.files} files, ${c.units} units`); return c; });
  const merged = { roots, files: 0, units: 0, kinds: {}, domains: {}, perRepo: {} };
  for (const c of reports) { merged.files += c.files; merged.units += c.units; for (const [k, v] of Object.entries(c.kinds)) merged.kinds[k] = (merged.kinds[k] ?? 0) + v; for (const [k, v] of Object.entries(c.domains)) merged.domains[k] = (merged.domains[k] ?? 0) + v; merged.perRepo[path.basename(c.root)] = { files: c.files, units: c.units, domains: c.domains }; }
  const sortDesc = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
  merged.kinds = sortDesc(merged.kinds); merged.domains = sortDesc(merged.domains);
  const json = JSON.stringify(merged, null, 1);
  if (out) fs.writeFileSync(out, json); else process.stdout.write(json);
}

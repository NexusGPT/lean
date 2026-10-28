// a conservative admission screen for the proposed heap core, not a translator
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ts, topLevelFunctions, COMPILER_OPTIONS } from '../common.mjs';
import { concepts } from '../concepts.mjs';
const census = process.argv[2];
const output = process.argv[3];
if (!census || !output || !path.isAbsolute(census) || !path.isAbsolute(output)) throw Error('pass absolute census and output paths');
const baseline = JSON.parse(fs.readFileSync(census, 'utf8'));
const domains = ['local bound to another name (alias)', 'closure mutates outer object'];
const instances = Object.fromEntries(domains.map(d => [d, []]));
const roots = [];
for (const name of Object.keys(baseline.perRepo).sort()) {
  const report = JSON.parse(fs.readFileSync(path.join(path.dirname(census), 'concepts', name + '.json'), 'utf8'));
  for (const root of report.roots) if (!roots.includes(root)) roots.push(root);
}
for (const root of roots) {
  const report = concepts(root, { instances: domains });
  for (const d of domains) instances[d].push(...(report.instances[d] ?? []));
}
const byFile = new Map();
for (const d of domains) for (const item of instances[d]) {
  const file = path.join(item.root, item.file);
  if (!byFile.has(file)) byFile.set(file, new Map());
  const units = byFile.get(file);
  if (!units.has(item.unit)) units.set(item.unit, { ...item, domains: [] });
  units.get(item.unit).domains.push(d);
}
const K = ts.SyntaxKind, T = ts.TypeFlags;
const rows = [];
const files = [...byFile.keys()].sort();
for (let offset = 0; offset < files.length; offset += 80) {
  const chunk = files.slice(offset, offset + 80);
  // imports are deliberately unresolved: imported unknown shapes are excluded, never guessed
  const options = { ...COMPILER_OPTIONS };
  const host = ts.createCompilerHost(options);
  host.resolveModuleNames = names => names.map(() => undefined);
  const program = ts.createProgram(chunk, options, host);
  const checker = program.getTypeChecker();
  for (const file of chunk) {
    const sf = program.getSourceFile(file);
    const units = sf ? topLevelFunctions(sf) : new Map();
    for (const item of byFile.get(file).values()) {
      const u = units.get(item.unit);
      const reasons = new Set();
      let referenceAliases = 0, primitiveAliases = 0;
      const no = reason => { reasons.add(reason); return false; };
      const plain = (t, seen = new Set()) => {
        if (!t || t.flags & (T.Any | T.Unknown | T.TypeParameter | T.Never)) return false;
        if (t.flags & (T.NumberLike | T.StringLike | T.BooleanLike | T.Null | T.Undefined | T.Void)) return true;
        if (seen.has(t) || seen.size > 8) return false;
        const more = new Set([...seen, t]);
        if (t.isUnion()) {
          const present = t.types.filter(x => !(x.flags & (T.Null | T.Undefined)));
          return (present.length <= 1 || present.every(x => x.flags & (T.NumberLike | T.StringLike | T.BooleanLike))) && t.types.every(x => plain(x, more));
        }
        if (checker.isArrayType(t) || checker.isTupleType(t)) return checker.getTypeArguments(t).every(x => plain(x, more));
        if (!(t.flags & T.Object) || checker.getSignaturesOfType(t, ts.SignatureKind.Call).length) return false;
        const props = checker.getPropertiesOfType(t);
        if (!props.length || checker.getIndexInfoOfType(t, ts.IndexKind.String)) return false;
        return props.every(p => plain(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? u.node), more));
      };
      const type = n => plain(checker.getTypeAtLocation(n)) || no('unknown or non-core type');
      const isRef = n => {
        const t = checker.getTypeAtLocation(n);
        return (t.isUnion() ? t.types : [t]).some(x => x.flags & T.Object);
      };
      const local = n => {
        if (n.text === 'undefined') return true;
        const decl = checker.getSymbolAtLocation(n)?.valueDeclaration;
        return !!decl && decl.pos >= u.fn.pos && decl.end <= u.fn.end || no('nonlocal name');
      };
      const expr = n => {
        if (!n) return true;
        type(n);
        if (ts.isIdentifier(n)) return local(n);
        if (ts.isLiteralExpression(n) || [K.TrueKeyword, K.FalseKeyword, K.NullKeyword].includes(n.kind)) return true;
        if (ts.isParenthesizedExpression(n) || ts.isNonNullExpression(n)) return expr(n.expression);
        if (ts.isPropertyAccessExpression(n)) return expr(n.expression);
        if (ts.isElementAccessExpression(n)) return expr(n.expression) && expr(n.argumentExpression);
        if (ts.isArrayLiteralExpression(n)) return n.elements.every(x => expr(ts.isSpreadElement(x) ? x.expression : x));
        if (ts.isObjectLiteralExpression(n)) return n.properties.every(p => {
          if (ts.isSpreadAssignment(p)) return expr(p.expression);
          if (ts.isShorthandPropertyAssignment(p)) return expr(p.name);
          if (ts.isPropertyAssignment(p) && !ts.isComputedPropertyName(p.name)) return expr(p.initializer);
          return no('object member form');
        });
        if (ts.isConditionalExpression(n)) return expr(n.condition) && expr(n.whenTrue) && expr(n.whenFalse);
        if (ts.isPrefixUnaryExpression(n) && [K.ExclamationToken, K.MinusToken].includes(n.operator)) return expr(n.operand);
        if (ts.isBinaryExpression(n) && [K.PlusToken, K.MinusToken, K.AsteriskToken, K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken].includes(n.operatorToken.kind)) return expr(n.left) && expr(n.right);
        if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
          const recv = n.expression.expression, name = n.expression.name.text;
          if (!checker.isArrayType(checker.getTypeAtLocation(recv))) return no('non-array call');
          expr(recv);
          if (['push', 'unshift'].includes(name) && n.arguments.length === 1) return expr(n.arguments[0]);
          if (['map', 'forEach'].includes(name) && n.arguments.length === 1 && ts.isArrowFunction(n.arguments[0])) {
            const cb = n.arguments[0];
            if (cb.modifiers?.some(x => x.kind === K.AsyncKeyword) || cb.parameters.length > 2) return no('callback shape');
            for (const p of cb.parameters) { if (!ts.isIdentifier(p.name) || p.dotDotDotToken || p.initializer) no('callback parameter'); else type(p.name); }
            return ts.isBlock(cb.body) ? stmt(cb.body) : expr(cb.body);
          }
          return no('array method outside core');
        }
        return no('expression ' + K[n.kind]);
      };
      const stmt = n => {
        if (ts.isBlock(n)) { n.statements.forEach(stmt); return true; }
        if (ts.isVariableStatement(n)) {
          for (const d of n.declarationList.declarations) {
            if (!ts.isIdentifier(d.name) || !d.initializer) { no('binding form'); continue; }
            type(d.name); expr(d.initializer);
            if (ts.isIdentifier(d.initializer) || ts.isPropertyAccessExpression(d.initializer)) {
              if (isRef(d.name)) referenceAliases++; else primitiveAliases++;
            }
          }
          return true;
        }
        if (ts.isReturnStatement(n)) return expr(n.expression);
        if (ts.isIfStatement(n)) { expr(n.expression); stmt(n.thenStatement); if (n.elseStatement) stmt(n.elseStatement); return true; }
        if (ts.isEmptyStatement(n)) return true;
        if (ts.isExpressionStatement(n)) {
          const e = n.expression;
          if (ts.isBinaryExpression(e) && [K.EqualsToken, K.PlusEqualsToken, K.MinusEqualsToken, K.AsteriskEqualsToken].includes(e.operatorToken.kind)) {
            if (!(ts.isIdentifier(e.left) || ts.isPropertyAccessExpression(e.left) || ts.isElementAccessExpression(e.left))) no('assignment target');
            return expr(e.left) && expr(e.right);
          }
          return expr(e);
        }
        return no('statement ' + K[n.kind]);
      };
      if (!u) no('not a named unit');
      else if (u.cls || u.isAsync || u.generics?.length) no('method, async or generic unit');
      else {
        for (const p of u.params) { if (!ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken) no('parameter form'); else type(p.name); }
        if (!plain(checker.getSignatureFromDeclaration(u.fn).getReturnType())) no('return type');
        if (ts.isBlock(u.body)) stmt(u.body); else expr(u.body);
      }
      rows.push({ ...item, line: u ? sf.getLineAndCharacterOfPosition(u.fn.getStart(sf)).line + 1 : null,
        sha256: sf ? createHash('sha256').update(sf.text).digest('hex') : null,
        eligible: reasons.size === 0, referenceAliases, primitiveAliases, reasons: [...reasons].sort() });
    }
  }
  console.error(`screened ${Math.min(offset + 80, files.length)}/${files.length} files`);
}
const counts = domains.map(domain => {
  const group = rows.filter(r => r.domains.includes(domain));
  return { domain, census: baseline.domains[domain], namedInstances: group.length,
    eligible: group.filter(r => r.eligible).length,
    eligibleWithReferenceAlias: group.filter(r => r.eligible && r.referenceAliases > 0).length };
});
const excludedReasons = Object.fromEntries(domains.map(d => {
  const reasons = {};
  for (const r of rows.filter(r => r.domains.includes(d))) for (const reason of r.reasons) reasons[reason] = (reasons[reason] ?? 0) + 1;
  return [d, reasons];
}));
const admitted = rows.filter(r => r.eligible);
const reviewed = rows.filter(r => ['rowFormatColumns', 'readySlot', 'Processor'].includes(r.unit));
const manifestSha256 = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
fs.writeFileSync(output, JSON.stringify({ census, roots, policy: 'conservative typed synchronous array/record core; structural eligibility, not translation or proof', counts, excludedReasons, admitted, reviewed, manifestSha256 }, null, 1) + '\n');
console.log(JSON.stringify(counts, null, 1));

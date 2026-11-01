// Directive comments (design/w1f-module-units.md): a comment the checker or a linter obeys. `@ts-ignore` and
// `@ts-expect-error` hide the type errors of the line after them, `@ts-nocheck` those of the whole file, `eslint-disable`
// (and its -line, -next-line forms, closed by `eslint-enable`) and `biome-ignore` the named lint rules over their scope.
// None of them changes what runs (the emitted JavaScript carries no type and no rule), so a change to one is not a unit's
// verdict: it is a rule record, saying which directive the change added or removed, where, over which lines and units,
// and, for a type directive, which of the checker's errors it now hides (added) or no longer hides (removed).
//
// A directive is matched across the two sides by what it is and what it covers (its kind, its rules, and the text of
// the line it governs), never by its line number: a directive an edit only moved is neither added nor removed.
//
//   directiveRecords({ file, parent, head, headFile, project }) -> [{ file, directive, rules, change, line, scope, unit, suppresses?, exposes?, msg }]
import fs from 'node:fs';
import path from 'node:path';
import { ts, topLevelFunctions, COMPILER_OPTIONS, projectless, parseProjectConfig } from '../common.mjs';
import { broken } from '../break.mjs'; // the one --break convention (A6; names in tests/break.mjs)

// the directives read, each with its scope: `next` the line after the comment, `line` the comment's own line, `block`
// to the matching enable (or the end of the file), `file` the whole file
const KINDS = [
  { directive: 'ts-ignore', re: /^(?:\/\/\/?|\/\*+)\s*@ts-ignore\b/, scope: 'next', checker: true },
  { directive: 'ts-expect-error', re: /^(?:\/\/\/?|\/\*+)\s*@ts-expect-error\b/, scope: 'next', checker: true },
  { directive: 'ts-nocheck', re: /^\/\/\/?\s*@ts-nocheck\b/, scope: 'file', checker: true },
  { directive: 'eslint-disable-next-line', re: /^(?:\/\/|\/\*+)\s*eslint-disable-next-line\b/, scope: 'next', rules: true },
  { directive: 'eslint-disable-line', re: /^(?:\/\/|\/\*+)\s*eslint-disable-line\b/, scope: 'line', rules: true },
  { directive: 'eslint-disable', re: /^(?:\/\/|\/\*+)\s*eslint-disable(?![-\w])/, scope: 'block', rules: true },
  { directive: 'eslint-enable', re: /^(?:\/\/|\/\*+)\s*eslint-enable(?![-\w])/, scope: 'line', rules: true },
  { directive: 'biome-ignore', re: /^(?:\/\/|\/\*+)\s*biome-ignore\b/, scope: 'next', rules: true },
];
// LEAN_BREAK=w1f-directive (tests/w1f-module-units.mjs --break w1f-directive): directives matched by their line number, so
// a directive an edit only moved reads as removed and added

// every comment of a file, read from the tree (each token's leading and trailing trivia), never from a scanner started
// at a line: a `//` inside a string or a template is text
function comments(sf) {
  const seen = new Map(), text = sf.text;
  const take = (ranges) => { for (const r of ranges ?? []) if (!seen.has(r.pos)) seen.set(r.pos, r); };
  const stack = [sf];
  while (stack.length) {
    const n = stack.pop();
    if (n.kind >= ts.SyntaxKind.FirstJSDocNode && n.kind <= ts.SyntaxKind.LastJSDocNode) continue;
    const children = n.getChildren(sf);
    if (!children.length || n.kind === ts.SyntaxKind.EndOfFileToken) { take(ts.getLeadingCommentRanges(text, n.pos)); take(ts.getTrailingCommentRanges(text, n.end)); }
    for (const c of children) stack.push(c);
  }
  take(ts.getLeadingCommentRanges(text, 0));
  return [...seen.values()].sort((a, b) => a.pos - b.pos);
}

// the rules a lint directive names: `eslint-disable a, b -- why` -> ['a', 'b']; none: every rule
const rulesOf = (body) => body.replace(/\*\/\s*$/, '').split(/\s--\s|\s--$/)[0].split(',').map((r) => r.trim()).filter(Boolean).sort();

export function directivesOf(sf) {
  const lines = sf.getLineAndCharacterOfPosition(Math.max(0, sf.text.length - 1)).line + 1; // the line of the last character
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const lineText = (line) => line >= 1 && line <= lines ? sf.text.slice(sf.getLineStarts()[line - 1], sf.getLineStarts()[line] ?? sf.text.length).trim() : '';
  const out = [];
  for (const c of comments(sf)) {
    const raw = sf.text.slice(c.pos, c.end);
    const kind = KINDS.find((k) => k.re.test(raw));
    if (!kind) continue;
    const body = raw.replace(kind.re, '');
    const start = lineOf(c.pos), end = lineOf(c.end);
    out.push({ directive: kind.directive, checker: !!kind.checker, rules: kind.rules ? rulesOf(body) : [], line: start, pos: c.pos, endPos: c.end, kind: kind.scope,
      scope: kind.scope === 'next' ? { start: end + 1, end: end + 1 } : kind.scope === 'line' ? { start, end } : kind.scope === 'file' ? { start: 1, end: lines } : { start, end: lines } });
  }
  // a block closes at the first later enable that names one of its rules (or any enable, for a block of every rule)
  for (const d of out) if (d.kind === 'block') {
    const close = out.find((e) => e.directive === 'eslint-enable' && e.pos > d.pos && (!e.rules.length || !d.rules.length || e.rules.some((r) => d.rules.includes(r))));
    if (close) d.scope = { start: d.line, end: close.line };
  }
  for (const d of out) d.anchor = d.kind === 'next' || d.kind === 'line' ? lineText(d.scope.start).replace(/\s+/g, ' ') : '';
  return out;
}

const keyOf = (d) => broken('w1f-directive') ? `${d.directive}|${d.rules.join(',')}|${d.line}` : `${d.directive}|${d.rules.join(',')}|${d.anchor}`;
// the directives one side has and the other lacks, as a multiset over the key
function difference(a, b) {
  const left = new Map();
  for (const d of b) left.set(keyOf(d), (left.get(keyOf(d)) ?? 0) + 1);
  return a.filter((d) => { const k = keyOf(d), n = left.get(k) ?? 0; if (n) { left.set(k, n - 1); return false; } return true; });
}

// the project's own checker options (the errors the project sees, not lean's strict reading), without emit
function projectOptions(abs, project) {
  const cfg = project === false ? '' : typeof project === 'string' ? path.resolve(project) : (ts.findConfigFile(path.dirname(abs), ts.sys.fileExists, 'tsconfig.json') ?? '');
  const parsed = cfg && fs.existsSync(cfg) ? parseProjectConfig(cfg) : null;
  const o = parsed ? { ...parsed.options, configFilePath: cfg } : { ...COMPILER_OPTIONS, ...projectless(abs) };
  o.noEmit = true; delete o.composite; delete o.incremental; delete o.tsBuildInfoFile;
  if (/\.[cm]?jsx?$/.test(abs)) { o.allowJs = true; if (o.checkJs === undefined) o.checkJs = false; }
  return o;
}

// the checker's errors per line of `abs` when its text is `text`
function errorsByLine(abs, text, options) {
  const host = ts.createCompilerHost(options, true), { getSourceFile, readFile } = host;
  host.getSourceFile = (f, lang, ...rest) => path.resolve(f) === abs ? ts.createSourceFile(f, text, lang, true) : getSourceFile.call(host, f, lang, ...rest);
  host.readFile = (f) => path.resolve(f) === abs ? text : readFile.call(host, f);
  const program = ts.createProgram([abs], options, host), sf = program.getSourceFile(abs);
  const by = new Map();
  if (!sf) return by;
  for (const d of [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)]) {
    if (d.category !== ts.DiagnosticCategory.Error || d.start === undefined) continue;
    const line = sf.getLineAndCharacterOfPosition(d.start).line + 1;
    if (!by.has(line)) by.set(line, []);
    by.get(line).push({ code: d.code, message: ts.flattenDiagnosticMessageText(d.messageText, ' ').slice(0, 200) });
  }
  return by;
}
// the text with every type directive made inert at the same length: the comment stays, its keyword no longer matches
const neutral = (text, ds) => { let t = text; for (const d of ds) if (d.checker) { const i = t.indexOf('@ts-', d.pos); if (i >= 0 && i < d.endPos) t = t.slice(0, i) + '@ts_' + t.slice(i + 4); } return t; };

const unitAt = (sf, line) => {
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const hold = [...topLevelFunctions(sf).values()].filter((u) => lineOf(u.node.getStart(sf)) <= line && line <= lineOf(u.node.getEnd()));
  hold.sort((a, b) => (a.node.getEnd() - a.node.getStart(sf)) - (b.node.getEnd() - b.node.getStart(sf)));
  return hold[0]?.name ?? null;
};

export function directiveRecords({ file, parent, head, headFile = null, project = true }) {
  const read = (text) => text === null ? null : ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const ps = read(parent), hs = read(head);
  const pd = ps ? directivesOf(ps) : [], hd = hs ? directivesOf(hs) : [];
  const added = difference(hd, pd), removed = difference(pd, hd);
  if (!added.length && !removed.length) return [];
  const records = [];
  // the checker's reading, made only when a type directive changed and the head has a file to read it in
  let errors = null;
  const typed = [...added, ...removed].some((d) => d.checker) && headFile && hs;
  if (typed) {
    const abs = path.resolve(headFile), options = projectOptions(abs, project);
    errors = { plain: errorsByLine(abs, head, options), open: errorsByLine(abs, neutral(head, hd), options) };
  }
  const span = (s) => s.start === s.end ? `line ${s.start}` : `lines ${s.start}-${s.end}`;
  const name = (d) => `\`${d.directive}${d.rules.length ? ' ' + d.rules.join(', ') : ''}\``;
  for (const d of added) {
    const unit = unitAt(hs, d.scope.start);
    const r = { file, directive: d.directive, rules: d.rules, change: 'added', line: d.line, scope: d.scope, unit };
    let what;
    if (errors && d.checker) {
      const lines = Array.from({ length: d.scope.end - d.scope.start + 1 }, (_, i) => d.scope.start + i);
      r.suppresses = lines.flatMap((l) => (errors.open.get(l) ?? []).map((e) => ({ line: l, ...e })));
      what = r.suppresses.length ? `hides ${r.suppresses.slice(0, 3).map((e) => `TS${e.code} at line ${e.line} (${e.message})`).join('; ')}${r.suppresses.length > 3 ? ` and ${r.suppresses.length - 3} more` : ''}` : d.directive === 'ts-expect-error' ? 'expects an error where the checker reports none (TS2578 in the head)' : 'hides nothing: the checker reports no error there';
    } else what = d.rules.length ? `silences ${d.rules.join(', ')}` : d.directive === 'eslint-enable' ? 'turns the rules back on' : 'silences every lint rule';
    r.msg = `added ${name(d)} over ${span(d.scope)}${unit ? ` (in ${unit})` : ''}: ${what}`;
    records.push(r);
  }
  for (const d of removed) {
    const r = { file, directive: d.directive, rules: d.rules, change: 'removed', line: d.line, scope: d.scope, unit: unitAt(ps, d.scope.start), side: 'parent' };
    let what;
    if (errors && d.checker && d.kind === 'next') {
      // the governed line in the head: the line with the same text nearest the parent's
      const starts = hs.getLineStarts(), texts = starts.map((s, i) => hs.text.slice(s, starts[i + 1] ?? hs.text.length).trim().replace(/\s+/g, ' '));
      const at = texts.map((t, i) => [t, i + 1]).filter(([t]) => t === d.anchor).map(([, l]) => l).sort((a, b) => Math.abs(a - d.scope.start) - Math.abs(b - d.scope.start))[0];
      r.exposes = at ? (errors.plain.get(at) ?? []).map((e) => ({ line: at, ...e })) : [];
      what = r.exposes.length ? `the checker now reports ${r.exposes.slice(0, 3).map((e) => `TS${e.code} at line ${e.line} (${e.message})`).join('; ')}` : 'the checker reports no error there now';
    } else what = d.rules.length ? `${d.rules.join(', ')} report there again` : 'the rules it silenced report there again';
    r.msg = `removed ${name(d)} over ${span(d.scope)} of the parent${r.unit ? ` (in ${r.unit})` : ''}: ${what}`;
    records.push(r);
  }
  return records.sort((a, b) => a.line - b.line || a.change.localeCompare(b.change));
}

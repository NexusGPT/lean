// Shared helpers for lean-ts: load the vendored TypeScript compiler, build a strict program,
// and read the proof hints (@decreases, @invariant) that a source may carry in comments.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
export const ts = require('./vendor/typescript/lib/typescript.js');
export const here = path.dirname(fileURLToPath(import.meta.url));

export const COMPILER_OPTIONS = {
  strict: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  noUncheckedIndexedAccess: false,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ES2020,
  lib: ['lib.es2015.d.ts'],
  types: [],
  noEmit: true,
  skipLibCheck: true,
};

export function loadProgram(file) {
  const abs = path.resolve(file);
  const program = ts.createProgram([abs], COMPILER_OPTIONS);
  const sf = program.getSourceFile(abs);
  if (!sf) throw new Error(`cannot read ${file}`);
  const checker = program.getTypeChecker();
  const diagnostics = [
    ...program.getSyntacticDiagnostics(sf),
    ...program.getSemanticDiagnostics(sf),
  ];
  return { program, sf, checker, diagnostics, abs };
}

export function lineOf(sf, pos) {
  return sf.getLineAndCharacterOfPosition(pos).line + 1;
}
export function colOf(sf, pos) {
  return sf.getLineAndCharacterOfPosition(pos).character + 1;
}
export function span(sf, node) {
  return [lineOf(sf, node.getStart(sf)), lineOf(sf, node.getEnd())];
}

// Accepts [[s,e],...], [{start,end}|{from,to}...] or {ranges:[...]}; lines are 1-based and inclusive.
export function readRanges(fs, file) {
  let raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (raw && !Array.isArray(raw) && raw.ranges) raw = raw.ranges;
  if (!Array.isArray(raw)) throw new Error('ranges file must be a JSON array');
  return raw.map((r) => {
    if (Array.isArray(r)) return [Number(r[0]), Number(r[1])];
    return [Number(r.start ?? r.from), Number(r.end ?? r.to)];
  });
}
export function overlaps(sf, node, ranges) {
  if (!ranges) return true;
  const [a, b] = span(sf, node);
  return ranges.some(([s, e]) => s <= b && a <= e);
}

// Proof hints live in the comments just before a loop: `// @decreases <expr>`, `// @invariant <expr>`.
// They are untrusted: the prover checks them, a wrong hint only makes the proof fail.
export function hintsOf(sf, node) {
  const ranges = ts.getLeadingCommentRanges(sf.text, node.getFullStart()) ?? [];
  const out = { decreases: null, invariants: [] };
  for (const r of ranges) {
    const text = sf.text.slice(r.pos, r.end);
    for (const line of text.split('\n')) {
      let m = line.match(/@decreases\s+(.+?)\s*(\*\/)?$/);
      if (m) out.decreases = m[1];
      m = line.match(/@invariant\s+(.+?)\s*(\*\/)?$/);
      if (m) out.invariants.push(m[1]);
    }
  }
  return out;
}

export function topLevelFunctions(sf) {
  const map = new Map();
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) map.set(st.name.text, st);
  }
  return map;
}

export function isArrayLike(checker, type) {
  return checker.isArrayType(type) || checker.isTupleType(type);
}
export function isTuple(checker, type) {
  return checker.isTupleType(type);
}
export function stripUndefined(type) {
  if (!(type.flags & ts.TypeFlags.Union)) return { base: type, optional: false };
  const parts = type.types.filter((t) => !(t.flags & ts.TypeFlags.Undefined));
  const optional = parts.length !== type.types.length;
  if (!optional) return { base: type, optional: false };
  if (parts.length === 1) return { base: parts[0], optional };
  // boolean | undefined is the union true | false | undefined
  if (parts.every((t) => t.flags & ts.TypeFlags.BooleanLiteral)) return { base: parts[0].checker ?? parts[0], optional, bool: true };
  return { base: type, optional, multi: true };
}

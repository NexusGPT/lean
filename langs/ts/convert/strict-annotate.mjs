// strict-annotate (proved by erasure): an `any-type` proposal that is one concrete type (a primitive, an array of one,
// or a named type, never a union, a record literal, a function type or `unknown`) is written as the declared type of
// the value. A type annotation is erased when TypeScript emits JavaScript, so the rewrite keeps behaviour exactly; the
// transform proves that at the site: the file's emitted JavaScript is the same text before and after the edit, under
// decorator metadata (where a type annotation becomes a run-time value) and under both readings of class fields. A
// site whose emit changes is listed. The converter's round then keeps the edit only when no new type error appears.
import { ts } from './util.mjs';

// the JavaScript TypeScript emits for a file's text under one set of options; types are erased, everything else stays
function emitOf(text, fileName, extra) {
  const jsx = /\.tsx$/.test(fileName) ? { jsx: ts.JsxEmit.Preserve } : {};
  return ts.transpileModule(text, { fileName, reportDiagnostics: false, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true, emitDecoratorMetadata: true, removeComments: false, ...jsx, ...extra } }).outputText;
}
// the same JavaScript before and after, under each option set a project may hold that lets a type reach run time
const EMIT_SETS = [{ useDefineForClassFields: true }, { useDefineForClassFields: false }];
export const ERASURE_SETTINGS = 'ts.transpileModule, target ES2022, experimentalDecorators and emitDecoratorMetadata on, once with useDefineForClassFields true and once false';
export function erased(fileName, before, after) {
  if (before === after) return true;
  try { return EMIT_SETS.every((o) => emitOf(before, fileName, o) === emitOf(after, fileName, o)); } catch { return false; }
}

// the edits of a plan applied to a text, last first
export function applyText(text, edits) {
  let out = text;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

// one concrete type: no union at the top, no record literal, no function type, nothing unknown or any
export function concreteType(p) {
  if (!p || /\bunknown\b|\bany\b|\bobject\b|=>|[{}|&]|\bimport\(/.test(p)) return false;
  return /^(string|number|boolean|[A-Za-z_$][\w$.]*(<[\w$., <>[\]]*>)?)(\[\])*$/.test(p.trim());
}

export default {
  name: 'strict-annotate',
  rules: ['any-type'],
  plan({ sf, finding, file }) {
    if (!finding.proposal) return { list: `no type is proposed (${finding.label}): ${finding.msg}` };
    if (!concreteType(finding.proposal)) return { list: `the proposal ${finding.proposal} is not one concrete type; a person writes the type` };
    if (!finding.fix) return { list: 'no place to write the annotation (a bound name or a for-of binding)' };
    const at = (l, c) => sf.getPositionOfLineAndCharacter(l - 1, c - 1);
    const edit = { start: at(finding.fix.line, finding.fix.col), end: at(finding.fix.endLine, finding.fix.endCol), text: finding.fix.text };
    if (!erased(file, sf.text, applyText(sf.text, [edit]))) return { list: 'the annotation would change the emitted JavaScript (decorator metadata reads it)' };
    return { edits: [edit], guard: `erased: the emitted JavaScript is unchanged; ${finding.precondition ?? 'the uses fix the type'}` };
  },
};

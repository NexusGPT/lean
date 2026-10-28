// eslint-plugin-lean: every construct lean cannot prove, shown in the editor at its line, with what to write instead.
//
//   // eslint.config.mjs
//   import lean from './path/to/lean/langs/ts/eslint/index.mjs';
//   export default [ lean.configs.recommended ];
//
// One rule, `lean/provable`. It runs lean's own lint on the file inside its project (the same lint `lean check`
// uses), so what the editor shows is exactly what the proof lane will refuse. Where a mechanical rewrite keeps the
// author's meaning it is offered as an ESLint suggestion; where it does not (a mutation that must become a returned
// value), the message says the shape to write and no rewrite is offered. A value typed `any` or `unknown` is shown with
// the type its uses and same-file callers propose and the label of that proposal (rule any-type, option `anyType`, on
// by default); when the proposal is conditional, the quick fix (an ESLint suggestion) inserts the annotation at the
// declaration and changes nothing else; a `flag-only` finding marks a value no evidence types and offers no fix.
import { lintFile } from '../lint/lint.mjs';

import { ADVICE } from '../lint/advice.mjs';

const provable = {
  meta: {
    type: 'problem',
    docs: { description: 'what lean cannot prove in this file, at its line, with what to write instead' },
    hasSuggestions: true,
    schema: [{ type: 'object', properties: { project: { type: ['string', 'boolean'] }, anyType: { type: 'boolean' }, advisory: { type: 'boolean' } }, additionalProperties: false }],
  },
  create(context) {
    const project = context.options[0]?.project ?? true;
    const anyType = context.options[0]?.anyType ?? true;
    const advisory = context.options[0]?.advisory ?? true;
    return {
      Program() {
        let findings;
        try { findings = lintFile(context.filename ?? context.getFilename(), null, { project, anyType, advisory }); }
        catch (e) { context.report({ loc: { line: 1, column: 0 }, message: `lean: could not read this file in its project: ${e.message}` }); return; }
        const src = context.sourceCode ?? context.getSourceCode();
        for (const f of findings) {
          const loc = { start: { line: f.line, column: f.col - 1 }, end: { line: f.endLine, column: f.endCol - 1 } };
          const advice = f.advice ?? ''; // the rewrite with its label in front: [proved], [conditional: <precondition>], [migration] or [flag-only]
          const suggest = [];
          const range = [src.getIndexFromLoc(loc.start), src.getIndexFromLoc(loc.end)];
          if (f.rule === 'division' && f.text) suggest.push({ desc: 'integer division: wrap in Math.floor(...)', fix: (fixer) => fixer.replaceTextRange(range, `Math.floor(${f.text})`) });
          if (f.rule === 'loose-equality' && f.text) suggest.push({ desc: 'strict equality', fix: (fixer) => fixer.replaceTextRange(range, f.text.replace(/==(?!=)/, '===').replace(/!=(?!=)/, '!==')) });
          if (f.rule === 'var' && f.text) suggest.push({ desc: 'let instead of var', fix: (fixer) => fixer.replaceTextRange(range, f.text.replace(/^var\b/, 'let')) });
          if (f.rule === 'any-type') { // a proposal, not a refusal: the label says what accepting it costs
            if (f.label === 'conditional' && f.fix) { const at = [src.getIndexFromLoc({ line: f.fix.line, column: f.fix.col - 1 }), src.getIndexFromLoc({ line: f.fix.endLine, column: f.fix.endCol - 1 })]; suggest.push({ desc: `annotate ${f.name} as ${f.proposal.length > 80 ? f.proposal.slice(0, 77) + '...' : f.proposal}`, fix: (fixer) => fixer.replaceTextRange(at, f.fix.text) }); }
            context.report({ loc, message: `lean (any-type): ${f.msg}; ${advice}`, suggest });
            continue;
          }
          if (f.advisory) {
            context.report({ loc, message: `lean advice (${f.rule}): ${f.msg}; ${advice}`, suggest });
            continue;
          }
          context.report({ loc, message: `lean cannot prove this (${f.rule}): ${f.msg}${advice ? ' — ' + advice : ''}`, suggest });
        }
      },
    };
  },
};

const plugin = { meta: { name: 'eslint-plugin-lean', version: '3.0.0' }, rules: { provable } };
plugin.configs = {
  recommended: { name: 'lean/recommended', files: ['**/*.ts', '**/*.tsx', '**/*.mts'], plugins: { lean: plugin }, rules: { 'lean/provable': 'warn' } },
};
export default plugin;
export { provable, ADVICE };

// eslint-plugin-lean: every construct lean cannot prove, shown in the editor at its line, with what to write instead.
//
//   // eslint.config.mjs
//   import lean from './path/to/lean/langs/ts/eslint/index.mjs';
//   export default [ lean.configs.recommended ];
//
// One rule, `lean/provable`. It runs lean's own lint on the file inside its project (the same lint `lean check`
// uses), so what the editor shows is exactly what the proof lane will refuse. Where a mechanical rewrite keeps the
// author's meaning it is offered as an ESLint suggestion; where it does not (a mutation that must become a returned
// value), the message says the shape to write and no rewrite is offered.
import { lintFile } from '../lint/lint.mjs';

import { ADVICE } from '../lint/advice.mjs';

const provable = {
  meta: {
    type: 'problem',
    docs: { description: 'what lean cannot prove in this file, at its line, with what to write instead' },
    hasSuggestions: true,
    schema: [{ type: 'object', properties: { project: { type: ['string', 'boolean'] } }, additionalProperties: false }],
  },
  create(context) {
    const project = context.options[0]?.project ?? true;
    return {
      Program() {
        let findings;
        try { findings = lintFile(context.filename ?? context.getFilename(), null, { project }); }
        catch (e) { context.report({ loc: { line: 1, column: 0 }, message: `lean: could not read this file in its project: ${e.message}` }); return; }
        const src = context.sourceCode ?? context.getSourceCode();
        for (const f of findings) {
          const loc = { start: { line: f.line, column: f.col - 1 }, end: { line: f.endLine, column: f.endCol - 1 } };
          const advice = ADVICE[f.rule] ?? '';
          const suggest = [];
          const range = [src.getIndexFromLoc(loc.start), src.getIndexFromLoc(loc.end)];
          if (f.rule === 'division' && f.text) suggest.push({ desc: 'integer division: wrap in Math.floor(...)', fix: (fixer) => fixer.replaceTextRange(range, `Math.floor(${f.text})`) });
          if (f.rule === 'loose-equality' && f.text) suggest.push({ desc: 'strict equality', fix: (fixer) => fixer.replaceTextRange(range, f.text.replace(/==(?!=)/, '===').replace(/!=(?!=)/, '!==')) });
          if (f.rule === 'var' && f.text) suggest.push({ desc: 'let instead of var', fix: (fixer) => fixer.replaceTextRange(range, f.text.replace(/^var\b/, 'let')) });
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

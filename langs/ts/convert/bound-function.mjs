// bound-function (conditional, decided at the site by the lint): `f.bind(r, a)(b)` becomes `f(a, b)` where the lint's
// finding says the rewrite is proved (no-useless-call, lint.mjs uselessCallSite): `f` is a same-file function with no
// `this` in it, the receiver `r` is absent, `undefined`, `null` or `this`, and the bound value is called at once.
// ECMA-262 (10.4.1.1, [[Call]] of a bound function) calls the target with the bound receiver and the bound arguments
// first, then the call's own; a target that never reads `this` cannot observe the receiver, and evaluating `r` has no
// effect (a literal, `undefined` or `this`). The order of evaluation is kept: `f`, the bound arguments, then the
// call's arguments. A held bound value is never rewritten (the lint labels it migration): it differs from any rewrite
// in identity, `name`, `length` and under `new`. A site the lint did not decide `proved` is listed.
import { ts, src, unparen } from './util.mjs';

export default {
  name: 'bound-function',
  rules: ['bound-function'],
  plan({ sf, node, finding }) {
    if (!(finding.label === 'proved' && finding.labelDecided)) return { list: 'the lint did not establish the precondition at this site (a same-file function with no `this`, a receiver of undefined, null or this, called at once)' };
    const bind = node && ts.isCallExpression(node) ? node : null;
    const callee = bind && ts.isPropertyAccessExpression(bind.expression) ? bind.expression : null;
    if (!callee || callee.name.text !== 'bind' || callee.questionDotToken || bind.questionDotToken) return { list: 'the finding is not on a plain `f.bind(...)` call' };
    let use = bind; while (use.parent && ts.isParenthesizedExpression(use.parent)) use = use.parent;
    const call = use.parent;
    if (!call || !ts.isCallExpression(call) || call.expression !== use || call.questionDotToken) return { list: 'the bound value is not called at once' };
    if (bind.typeArguments?.length || call.typeArguments?.length) return { list: 'a call with type arguments; a person writes the direct call' };
    const args = [...bind.arguments.slice(1), ...call.arguments].map((a) => src(sf, a));
    const target = unparen(callee.expression);
    return {
      edits: [{ start: call.getStart(sf), end: call.end, text: `${src(sf, target)}(${args.join(', ')})` }],
      guard: 'the lint decided the target never reads `this`, the receiver has no effect, and the bound value is called at once',
    };
  },
};

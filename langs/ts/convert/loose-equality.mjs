// loose-equality (conditional, decided at the site by the lint): `==` becomes `===` and `!=` becomes `!==` when the
// lint's finding says the operand types prove the rewrite (its label at the site is `proved`: a `typeof` against a
// string literal, two literals of one primitive type, or one static primitive type on both sides without null or
// undefined, where the coercion table's identity row makes the two operators agree). A finding the lint left
// conditional is listed for a person: the precondition is not established at that site.
import { ts, K } from './util.mjs';

export default {
  name: 'loose-equality',
  rules: ['loose-equality'],
  plan({ sf, node, finding }) {
    if (!(finding.label === 'proved' && finding.labelDecided)) return { list: 'the lint did not establish the precondition at this site (both sides of one primitive type, never null or undefined)' };
    if (!node || !ts.isBinaryExpression(node) || ![K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(node.operatorToken.kind)) return { list: 'the finding is not on a loose comparison' };
    const op = node.operatorToken;
    return { edits: [{ start: op.getStart(sf), end: op.end, text: op.kind === K.EqualsEqualsToken ? '===' : '!==' }], guard: 'the lint decided the operand types prove the rewrite' };
  },
};

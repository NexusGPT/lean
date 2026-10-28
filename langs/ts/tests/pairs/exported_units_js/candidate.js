module.exports = {
  meta: { type: 'problem' },
  create(context) {
    return {
      Identifier(node) {
        if (node.name === 'y') context.report({ node, message: 'no x' });
      },
    };
  },
  join(a, b) { return a + '/' + b; },
  /** @param {number} n */
  twice(n) { return n + n; },
};

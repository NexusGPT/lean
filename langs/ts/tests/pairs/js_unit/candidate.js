const BASE = 11;

function scale(x) {
  return x * BASE + 1;
}

/**
 * @param {number} n
 * @returns {number}
 */
function double(n) {
  return n + n;
}

module.exports = { scale, double };

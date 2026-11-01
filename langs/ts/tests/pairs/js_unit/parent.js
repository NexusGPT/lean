const BASE = 10;

function scale(x) {
  return x * BASE;
}

/**
 * @param {number} n
 * @returns {number}
 */
function double(n) {
  return n * 2;
}

module.exports = { scale, double };

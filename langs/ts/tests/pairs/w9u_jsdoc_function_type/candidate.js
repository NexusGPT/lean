// @ts-check

/**
 * @param {number} k
 * @return {function(number): number} a function that scales its argument by k
 */
function scaler(k) {
  return (x) => x * k;
}

/**
 * @param {number} n
 * @return {number}
 */
function tripled(n) {
  const f = scaler(3);
  return f(n + 1);
}

/**
 * @param {number} n
 * @return {number}
 */
function doubled(n) {
  return n + n;
}

module.exports = { scaler, tripled, doubled };

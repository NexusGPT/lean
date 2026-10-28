// Strings that match a regular expression, drawn with a seeded generator. A unit that parses its input with a regex
// takes most inputs down the "no match" branch; a few matching strings in the input pool reach the other branch.
// Supported: literals, escapes (\d \w \s \D \W \S \. \- and others as the literal char), classes [a-z0-9_] with
// negation, groups (capturing, non-capturing, named), alternation, quantifiers * + ? {n} {n,} {n,m} (lazy flags
// ignored), anchors (ignored), the dot. Lookarounds and backreferences make the function return null.
const LETTERS = 'abcdefghijklmnopqrstuvwxyz', DIGITS = '0123456789', WORD = LETTERS + LETTERS.toUpperCase() + DIGITS + '_';

export function sampleRegex(source, rng, count = 2) {
  let pos = 0;
  const peek = () => source[pos], next = () => source[pos++];
  const pick = (s) => s[Math.floor(rng() * s.length)];
  const rep = (n) => n;
  function escapeChar(c) {
    switch (c) {
      case 'd': return () => pick(DIGITS); case 'D': return () => pick(LETTERS);
      case 'w': return () => pick(WORD); case 'W': return () => pick(' -.,');
      case 's': return () => ' '; case 'S': return () => pick(WORD);
      case 'n': return () => '\n'; case 't': return () => '\t';
      case 'b': case 'B': return () => '';
      default: return () => c; // \. \- \/ \( etc
    }
  }
  function cls() { // after '['
    let neg = false; if (peek() === '^') { neg = true; next(); }
    const chars = [];
    while (pos < source.length && peek() !== ']') {
      let c = next();
      if (c === '\\') { const e = next(); if (e === 'd') chars.push(...DIGITS); else if (e === 'w') chars.push(...WORD); else if (e === 's') chars.push(' '); else chars.push(e); continue; }
      if (peek() === '-' && source[pos + 1] !== ']' && pos + 1 < source.length) { next(); const hi = next(); for (let k = c.charCodeAt(0); k <= hi.charCodeAt(0) && k - c.charCodeAt(0) < 64; k++) chars.push(String.fromCharCode(k)); continue; }
      chars.push(c);
    }
    next(); // ']'
    if (!neg) return () => (chars.length ? pick(chars) : '');
    const pool = (WORD + ' -.,:/').split('').filter((x) => !chars.includes(x));
    return () => (pool.length ? pick(pool) : 'x');
  }
  function atom() {
    const c = next();
    if (c === '(') {
      if (peek() === '?') { next(); const k = next(); if (k === ':') { /* non-capturing */ } else if (k === '<' && (peek() === '=' || peek() === '!')) throw new Error('lookbehind'); else if (k === '<') { while (next() !== '>'); } else if (k === '=' || k === '!') throw new Error('lookahead'); }
      const inner = alt(); if (next() !== ')') throw new Error('group'); return inner;
    }
    if (c === '[') return cls();
    if (c === '\\') { const e = next(); if (/[1-9]/.test(e)) throw new Error('backreference'); return escapeChar(e); }
    if (c === '.') return () => pick(WORD);
    if (c === '^' || c === '$') return () => '';
    return () => c;
  }
  function quantified() {
    const a = atom();
    const q = peek();
    let lo = 1, hi = 1;
    if (q === '*') { next(); lo = 0; hi = 3; } else if (q === '+') { next(); lo = 1; hi = 3; } else if (q === '?') { next(); lo = 0; hi = 1; }
    else if (q === '{') { next(); let t = ''; while (peek() !== '}') t += next(); next(); const [l, h] = t.split(','); lo = Number(l) || 0; hi = h === undefined ? lo : h === '' ? lo + 2 : Number(h); }
    if (peek() === '?') next(); // lazy: same language
    return () => { const n = lo + Math.floor(rng() * (hi - lo + 1)); let out = ''; for (let i = 0; i < n; i++) out += a(); return out; };
  }
  function seq() { const parts = []; while (pos < source.length && peek() !== '|' && peek() !== ')') parts.push(quantified()); return () => parts.map((p) => p()).join(''); }
  function alt() { const branches = [seq()]; while (peek() === '|') { next(); branches.push(seq()); } return () => pick(branches)(); }
  try {
    const gen = alt();
    if (pos !== source.length) return null;
    const out = []; for (let i = 0; i < count; i++) out.push(gen());
    return out;
  } catch { return null; }
}

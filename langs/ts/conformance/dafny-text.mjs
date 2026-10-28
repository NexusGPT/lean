// the Dafny text the translator writes, read back: its types, datatypes, unit signatures and domain hypotheses, and a
// compilable copy where every part without a body (a bodiless function or predicate, an opaque type) is an extern of
// one module, `LeanOpaque`. The extern is never given a body here: model.mjs answers it by stopping the run (unary) or
// by one shared table (the product check), and says which.

// split at a separator outside every bracket pair
export function splitTop(s, sep = ',') {
  const out = []; let depth = 0, cur = '', inStr = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inStr) { cur += c; if (c === '\\') { cur += s[++i] ?? ''; continue; } if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; cur += c; continue; }
    if ('<([{'.includes(c)) depth++;
    else if ('>)]}'.includes(c) && !(c === '>' && s[i - 1] === '-')) depth--; // an arrow's `>` closes nothing
    if (depth === 0 && s.startsWith(sep, i)) { out.push(cur); cur = ''; i += sep.length - 1; continue; }
    cur += c;
  }
  if (cur.trim() !== '' || out.length) out.push(cur);
  return out.map((x) => x.trim());
}

// a type as a tree: {k: 'name', name, args} | {k: 'tuple', items} | {k: 'arrow', from, to}
export function parseType(s) {
  s = s.trim();
  for (const arrow of ['-->', '~>', '->']) { const parts = splitTop(s, arrow); if (parts.length > 1) return { k: 'arrow', from: parts.slice(0, -1).map(parseType), to: parseType(parts.at(-1)), text: s }; }
  if (s.startsWith('(') && closes(s, 0) === s.length - 1) {
    const inner = s.slice(1, -1).trim();
    if (inner === '') return { k: 'tuple', items: [], text: s };
    const items = splitTop(inner);
    return items.length === 1 ? parseType(items[0]) : { k: 'tuple', items: items.map(parseType), text: s };
  }
  const m = s.match(/^([A-Za-z_][A-Za-z0-9_.]*)\s*(?:<(.*)>)?$/s);
  if (!m) return { k: 'unknown', text: s };
  return { k: 'name', name: m[1], args: m[2] !== undefined ? splitTop(m[2]).map(parseType) : [], text: s };
}
function closes(s, i) { let d = 0; for (let j = i; j < s.length; j++) { if (s[j] === '(') d++; else if (s[j] === ')') { d--; if (d === 0) return j; } } return -1; }

const tparamNames = (t) => (t ? splitTop(t).map((x) => x.replace(/\(.*\)$/, '').replace(/\(==\)/, '').trim()) : []);

// every datatype, type synonym and opaque type the text declares
export function declarations(text) {
  const datatypes = new Map(), synonyms = new Map(), opaque = new Set();
  for (const line of text.split('\n')) {
    let m = line.match(/^datatype\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:<(.*?)>)?\s*=\s*(.*)$/);
    if (m) {
      const ctors = splitTop(m[3], '|').map((c) => {
        const cm = c.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:\((.*)\))?$/s);
        if (!cm) return { name: c, fields: [], unreadable: true };
        const fields = cm[2] !== undefined ? splitTop(cm[2]).map((f) => { const [decl, dflt] = splitTop(f, ':='); const i = decl.indexOf(':'); return { name: decl.slice(0, i).replace(/^ghost\s+/, '').trim(), type: parseType(decl.slice(i + 1)), default: dflt ?? null }; }) : [];
        return { name: cm[1], fields };
      });
      datatypes.set(m[1], { name: m[1], tparams: tparamNames(m[2]), ctors });
      continue;
    }
    m = line.match(/^type\s+(?:\{:[^}]*\}\s*)*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(==\))?\s*(?:<(.*?)>)?\s*(?:\(==\))?\s*(=\s*(.*))?$/);
    if (m) { if (m[3]) synonyms.set(m[1], { tparams: tparamNames(m[2]), type: parseType(m[4]) }); else opaque.add(m[1]); }
  }
  return { datatypes, synonyms, opaque };
}

// a function's signature: `function NAME<T>(params): RET`, the parameters as {name, type}
export function signature(text, name) {
  const m = text.match(new RegExp(`^(?:function|predicate)(?:\\s+\\{:[^}]*\\})*\\s+${name}\\s*(<(?:[^<>]|<[^<>]*>)*>)?\\((.*)\\)\\s*:\\s*(.*?)\\s*(?:\\{.*)?$`, 'm'));
  if (!m) return null;
  const params = m[2].trim() === '' ? [] : splitTop(m[2]).map((p) => { const i = p.indexOf(':'); return { name: p.slice(0, i).replace(/^ghost\s+/, '').trim(), type: parseType(p.slice(i + 1)) }; });
  return { name, tparams: tparamNames(m[1]?.slice(1, -1)), params, ret: parseType(m[3]) };
}

// the stated domain of a unit: its `requires` clauses and the heap hypothesis line (`// HYP name: expr`); `INRANGE`
// marks a unit whose answer is not modelled once the world's oob flag is set
export function domainOf(text, name) {
  const lines = text.split('\n'); const req = [];
  const at = lines.findIndex((l) => new RegExp(`^(?:function|predicate)(?:\\s+\\{:[^}]*\\})*\\s+${name}\\s*[<(]`).test(l));
  if (at >= 0) for (let j = at + 1; j < lines.length && /^\s+(requires|ensures|decreases|reads)\b/.test(lines[j]); j++) { const r = lines[j].match(/^\s+requires\s+(.*)$/); if (r) req.push(r[1]); }
  const hyp = (text.match(new RegExp(`^// HYP ${name}: (.+)$`, 'm')) ?? [])[1] ?? null;
  return { requires: req, hyp, inrange: new RegExp(`^// INRANGE ${name}$`, 'm').test(text) };
}

// the compilable copy: the prelude inlined at its include, every bodiless function or predicate and every opaque type
// marked `{:extern "LeanOpaque", "<name>"}`, and one predicate per unit holding its stated domain (LeanDomain_<unit>)
export function compilable(mainText, preludeText, units) {
  const text = preludeText != null ? mainText.replace(/^include "[^"]*"\s*$/m, () => preludeText) : mainText; // a function: the prelude's text holds `$'` and `$&` that a replacement string would expand
  const lines = text.split('\n'); const externs = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m = line.match(/^(function|predicate)((?:\s+\{:[^}]*\})*)\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (m) {
      const rest = line.slice(m[0].length).replace(/\{:[^}]*\}/g, '');
      let body = rest.includes('{');
      if (!body) { let j = i + 1; while (j < lines.length && /^\s+(requires|ensures|decreases|reads)\b/.test(lines[j])) j++; body = (lines[j] ?? '').trim().startsWith('{'); }
      if (!body) { lines[i] = `${m[1]} {:extern "LeanOpaque", "${m[3]}"}${m[2]} ${m[3]}${line.slice(m[0].length)}`; externs.push({ kind: m[1], name: m[3] }); }
      continue;
    }
    m = line.match(/^type\s+([A-Za-z_][A-Za-z0-9_]*)(.*)$/);
    // a type characteristic such as `(==)` is no definition
    if (m && !m[2].replace(/\((==|0|00|!new)\)/g, '').includes('=')) { lines[i] = `type {:extern "LeanOpaque", "${m[1]}"} ${m[1]}${m[2]}`; externs.push({ kind: 'type', name: m[1] }); }
  }
  const domains = [];
  for (const u of units) {
    const sig = signature(text, u); if (!sig) continue;
    const d = domainOf(text, u); const parts = [...(d.hyp ? [d.hyp] : []), ...d.requires.map((r) => `(${r})`)];
    if (!parts.length) continue;
    const tp = sig.tparams.length ? `<${sig.tparams.map((t) => `${t}(==)`).join(', ')}>` : '';
    domains.push(`predicate LeanDomain_${u}${tp}(${sig.params.map((p) => `${p.name}: ${p.type.text}`).join(', ')}) {\n  ${parts.join(' && ')}\n}`);
  }
  return { text: [lines.join('\n'), ...domains].join('\n\n') + '\n', externs, domains: domains.length };
}

// Dafny's JavaScript names: every underscore doubled
export const jsName = (n) => n.replace(/_/g, '__');

// The styles layer of a front-end certificate (design/ui-layers.md): a `className` string is read as the set of CSS
// declarations its utility classes produce under lean's pinned Tailwind configuration, not as text. Two class strings
// that resolve to the same declarations are equal in this layer (an order, a duplicate, a shorthand against its
// longhands); a different declaration is a styles WITNESS; a class outside the pinned table, a stacked or unknown
// variant, an opacity modifier, an important mark, or two classes writing one property with different values (the
// stylesheet's order decides, not the attribute's) make the element `unknown`, never equal. Two class strings with the
// same set of tokens are equal under any configuration, so they are equal even when a token is unknown.
//
// The pinned configuration: the Tailwind CSS v3.4 default theme, restricted to the utilities below. A project config
// that extends or overrides the theme is not read; the certificate names it as an assumption. Colours resolve to the
// default palette's hex values (the opacity variable v3 writes is the same on every colour, so it is left out).

export const PINNED = Object.freeze({ name: 'tailwindcss v3.4 default theme', scope: 'the utilities of exec/styles.mjs; every other class is unknown' });

const SPACING = { 0: '0px', px: '1px', '0.5': '0.125rem', 1: '0.25rem', '1.5': '0.375rem', 2: '0.5rem', '2.5': '0.625rem', 3: '0.75rem', '3.5': '0.875rem', 4: '1rem', 5: '1.25rem', 6: '1.5rem', 7: '1.75rem', 8: '2rem', 9: '2.25rem', 10: '2.5rem', 11: '2.75rem', 12: '3rem', 14: '3.5rem', 16: '4rem', 20: '5rem', 24: '6rem', 28: '7rem', 32: '8rem', 36: '9rem', 40: '10rem', 44: '11rem', 48: '12rem', 52: '13rem', 56: '14rem', 60: '15rem', 64: '16rem', 72: '18rem', 80: '20rem', 96: '24rem' };
const FRACTIONS = { '1/2': '50%', '1/3': '33.333333%', '2/3': '66.666667%', '1/4': '25%', '2/4': '50%', '3/4': '75%', '1/5': '20%', '2/5': '40%', '3/5': '60%', '4/5': '80%', '1/6': '16.666667%', '5/6': '83.333333%', full: '100%' };
const PALETTE = {
  slate: ['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#020617'],
  gray: ['#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827', '#030712'],
  red: ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'],
  green: ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'],
  blue: ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#172554'],
};
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const COLORS = { white: '#ffffff', black: '#000000', transparent: 'transparent', current: 'currentColor', inherit: 'inherit' };
for (const [p, vs] of Object.entries(PALETTE)) vs.forEach((v, i) => { COLORS[`${p}-${SHADES[i]}`] = v; });
// the table's own check: two colour names never share a value, so a transcription slip turns one difference into
// another difference and never into an equality
{ const seen = new Map(); for (const [k, v] of Object.entries(COLORS)) { if (seen.has(v)) throw new Error(`styles table: ${k} and ${seen.get(v)} share ${v}`); seen.set(v, k); } }

const FONT_SIZE = { xs: ['0.75rem', '1rem'], sm: ['0.875rem', '1.25rem'], base: ['1rem', '1.5rem'], lg: ['1.125rem', '1.75rem'], xl: ['1.25rem', '1.75rem'], '2xl': ['1.5rem', '2rem'], '3xl': ['1.875rem', '2.25rem'], '4xl': ['2.25rem', '2.5rem'], '5xl': ['3rem', '1'], '6xl': ['3.75rem', '1'] };
const WEIGHT = { thin: '100', extralight: '200', light: '300', normal: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800', black: '900' };
const RADIUS = { none: '0px', sm: '0.125rem', '': '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', '2xl': '1rem', '3xl': '1.5rem', full: '9999px' };
const LEADING = { none: '1', tight: '1.25', snug: '1.375', normal: '1.5', relaxed: '1.625', loose: '2', 3: '.75rem', 4: '1rem', 5: '1.25rem', 6: '1.5rem', 7: '1.75rem', 8: '2rem', 9: '2.25rem', 10: '2.5rem' };
const TRACKING = { tighter: '-0.05em', tight: '-0.025em', normal: '0em', wide: '0.025em', wider: '0.05em', widest: '0.1em' };
const MAXW = { 0: '0rem', none: 'none', xs: '20rem', sm: '24rem', md: '28rem', lg: '32rem', xl: '36rem', '2xl': '42rem', '3xl': '48rem', '4xl': '56rem', '5xl': '64rem', '6xl': '72rem', '7xl': '80rem', full: '100%', min: 'min-content', max: 'max-content', fit: 'fit-content', prose: '65ch' };
const DISPLAY = { block: 'block', 'inline-block': 'inline-block', inline: 'inline', flex: 'flex', 'inline-flex': 'inline-flex', grid: 'grid', 'inline-grid': 'inline-grid', hidden: 'none', contents: 'contents', table: 'table', 'flow-root': 'flow-root' };
const POSITION = ['static', 'fixed', 'absolute', 'relative', 'sticky'];
const ALIGN = { start: 'flex-start', end: 'flex-end', center: 'center', baseline: 'baseline', stretch: 'stretch' };
const JUSTIFY = { start: 'flex-start', end: 'flex-end', center: 'center', between: 'space-between', around: 'space-around', evenly: 'space-evenly' };
const SIDES = { t: ['top'], r: ['right'], b: ['bottom'], l: ['left'], x: ['left', 'right'], y: ['top', 'bottom'], '': ['top', 'right', 'bottom', 'left'] };
const CORNERS = { '': ['top-left', 'top-right', 'bottom-right', 'bottom-left'], t: ['top-left', 'top-right'], r: ['top-right', 'bottom-right'], b: ['bottom-right', 'bottom-left'], l: ['top-left', 'bottom-left'], tl: ['top-left'], tr: ['top-right'], br: ['bottom-right'], bl: ['bottom-left'] };
// symbolic values: two different keys of these theme scales are different values in the default theme
const SHADOW = ['sm', '', 'md', 'lg', 'xl', '2xl', 'inner', 'none'];
const DURATION = ['0', '75', '100', '150', '200', '300', '500', '700', '1000'];
const VARIANTS = { hover: ':hover', focus: ':focus', 'focus-visible': ':focus-visible', 'focus-within': ':focus-within', active: ':active', visited: ':visited', disabled: ':disabled', first: ':first-child', last: ':last-child', odd: ':nth-child(odd)', even: ':nth-child(even)', 'group-hover': '.group:hover *', 'group-focus': '.group:focus *', placeholder: '::placeholder', sm: '@media (min-width: 640px)', md: '@media (min-width: 768px)', lg: '@media (min-width: 1024px)', xl: '@media (min-width: 1280px)', '2xl': '@media (min-width: 1536px)', dark: '@media (prefers-color-scheme: dark)' };

const arbitrary = (v) => { const m = /^\[([^\]\s]+)\]$/.exec(v); return m ? m[1].replace(/_/g, ' ') : null; }; // `[3px]`: the value as written, underscores as spaces
const spacing = (v, neg) => { let x = Object.hasOwn(SPACING, v) ? SPACING[v] : arbitrary(v); if (x === null) return null; if (neg) x = x === '0px' ? '0px' : `-${x}`; return x; };
const size = (v, extra = {}) => (Object.hasOwn(extra, v) ? extra[v] : Object.hasOwn(FRACTIONS, v) ? FRACTIONS[v] : spacing(v, false));
const color = (v) => (Object.hasOwn(COLORS, v) ? COLORS[v] : /^\[#[0-9a-fA-F]{3,8}\]$/.test(v) ? v.slice(1, -1).toLowerCase() : null);
const each = (props, value) => Object.fromEntries(props.map((p) => [p, value]));

// one utility (no variant) to its declarations, or null when it is outside the pinned table
export function utility(cls) {
  const neg = cls.startsWith('-'); const c = neg ? cls.slice(1) : cls;
  let m;
  if (!neg && Object.hasOwn(DISPLAY, c)) return { display: DISPLAY[c] };
  if (!neg && POSITION.includes(c)) return { position: c };
  if ((m = /^(p|m)([trblxy]?)-(.+)$/.exec(c))) { if (neg && m[1] === 'p') return null; const v = m[1] === 'm' && m[3] === 'auto' && !neg ? 'auto' : spacing(m[3], neg); if (v === null) return null; return each(SIDES[m[2]].map((s) => `${m[1] === 'p' ? 'padding' : 'margin'}-${s}`), v); }
  if (!neg && (m = /^(p|m)([se])-(.+)$/.exec(c))) { const v = m[1] === 'm' && m[3] === 'auto' ? 'auto' : spacing(m[3], false); if (v === null) return null; return { [`${m[1] === 'p' ? 'padding' : 'margin'}-inline-${m[2] === 's' ? 'start' : 'end'}`]: v }; }
  if (!neg && (m = /^gap(-[xy])?-(.+)$/.exec(c))) { const v = spacing(m[2], false); if (v === null) return null; return m[1] === '-x' ? { 'column-gap': v } : m[1] === '-y' ? { 'row-gap': v } : { 'row-gap': v, 'column-gap': v }; }
  if ((m = /^space-([xy])-(.+)$/.exec(c))) { const v = spacing(m[2], neg); if (v === null) return null; return { [`> :not([hidden]) ~ :not([hidden]) margin-${m[1] === 'x' ? 'left' : 'top'}`]: v }; }
  if ((m = /^(inset|top|right|bottom|left)(-[xy])?-(.+)$/.exec(c))) { const raw = m[3]; const v = raw === 'auto' && !neg ? 'auto' : neg ? spacing(raw, true) ?? (Object.hasOwn(FRACTIONS, raw) ? `-${FRACTIONS[raw]}` : null) : size(raw); if (v === null) return null; const sides = m[1] === 'inset' ? (m[2] === '-x' ? ['left', 'right'] : m[2] === '-y' ? ['top', 'bottom'] : ['top', 'right', 'bottom', 'left']) : m[2] ? null : [m[1]]; return sides ? each(sides, v) : null; }
  if (neg) return null;
  if ((m = /^(w|h|size)-(.+)$/.exec(c))) { const v = size(m[2], { auto: 'auto', screen: m[1] === 'h' ? '100vh' : '100vw', min: 'min-content', max: 'max-content', fit: 'fit-content' }); if (v === null || (m[1] === 'size' && m[2] === 'screen')) return null; return m[1] === 'w' ? { width: v } : m[1] === 'h' ? { height: v } : { width: v, height: v }; }
  if ((m = /^(min|max)-(w|h)-(.+)$/.exec(c))) { const prop = `${m[1]}-${m[2] === 'w' ? 'width' : 'height'}`; const v = m[1] === 'max' && m[2] === 'w' ? (Object.hasOwn(MAXW, m[3]) ? MAXW[m[3]] : arbitrary(m[3])) : size(m[3], { full: '100%', screen: m[2] === 'h' ? '100vh' : '100vw', min: 'min-content', max: 'max-content', fit: 'fit-content', none: 'none' }); return v === null ? null : { [prop]: v }; }
  if ((m = /^flex-(row|row-reverse|col|col-reverse)$/.exec(c))) return { 'flex-direction': m[1].replace('col', 'column') };
  if ((m = /^flex-(wrap|nowrap|wrap-reverse)$/.exec(c))) return { 'flex-wrap': m[1] };
  if ((m = /^flex-(1|auto|initial|none)$/.exec(c))) return { flex: { 1: '1 1 0%', auto: '1 1 auto', initial: '0 1 auto', none: 'none' }[m[1]] };
  if ((m = /^(grow|shrink)(-0)?$/.exec(c))) return { [`flex-${m[1]}`]: m[2] ? '0' : '1' };
  if ((m = /^items-(.+)$/.exec(c)) && Object.hasOwn(ALIGN, m[1])) return { 'align-items': ALIGN[m[1]] };
  if ((m = /^self-(.+)$/.exec(c)) && (Object.hasOwn(ALIGN, m[1]) || m[1] === 'auto')) return { 'align-self': m[1] === 'auto' ? 'auto' : ALIGN[m[1]] };
  if ((m = /^justify-(.+)$/.exec(c)) && Object.hasOwn(JUSTIFY, m[1])) return { 'justify-content': JUSTIFY[m[1]] };
  if ((m = /^grid-cols-(\d+|none)$/.exec(c)) && (m[1] === 'none' || (+m[1] >= 1 && +m[1] <= 12))) return { 'grid-template-columns': m[1] === 'none' ? 'none' : `repeat(${m[1]}, minmax(0, 1fr))` };
  if ((m = /^col-span-(\d+|full)$/.exec(c)) && (m[1] === 'full' || (+m[1] >= 1 && +m[1] <= 12))) return { 'grid-column': m[1] === 'full' ? '1 / -1' : `span ${m[1]} / span ${m[1]}` };
  if ((m = /^text-(.+)$/.exec(c))) {
    if (Object.hasOwn(FONT_SIZE, m[1])) return { 'font-size': FONT_SIZE[m[1]][0], 'line-height': FONT_SIZE[m[1]][1] };
    if (['left', 'center', 'right', 'justify', 'start', 'end'].includes(m[1])) return { 'text-align': m[1] };
    const col = color(m[1]); return col === null ? null : { color: col };
  }
  if ((m = /^bg-(.+)$/.exec(c))) { const col = color(m[1]); return col === null ? null : { 'background-color': col }; }
  if ((m = /^border-(.+)$/.exec(c)) && color(m[1]) !== null) return { 'border-color': color(m[1]) };
  if ((m = /^border(?:-([trblxy]))?(?:-(0|2|4|8))?$/.exec(c))) return each(SIDES[m[1] ?? ''].map((s) => `border-${s}-width`), `${m[2] ?? 1}px`);
  if ((m = /^border-(solid|dashed|dotted|double|none)$/.exec(c))) return { 'border-style': m[1] };
  if ((m = /^rounded(?:-(t|r|b|l|tl|tr|br|bl))?(?:-(none|sm|md|lg|xl|2xl|3xl|full))?$/.exec(c))) return each(CORNERS[m[1] ?? ''].map((k) => `border-${k}-radius`), RADIUS[m[2] ?? '']);
  if ((m = /^font-(.+)$/.exec(c))) { if (Object.hasOwn(WEIGHT, m[1])) return { 'font-weight': WEIGHT[m[1]] }; if (['sans', 'serif', 'mono'].includes(m[1])) return { 'font-family': `theme(fontFamily.${m[1]})` }; return null; }
  if ((m = /^leading-(.+)$/.exec(c)) && Object.hasOwn(LEADING, m[1])) return { 'line-height': LEADING[m[1]] };
  if ((m = /^tracking-(.+)$/.exec(c)) && Object.hasOwn(TRACKING, m[1])) return { 'letter-spacing': TRACKING[m[1]] };
  if (c === 'italic' || c === 'not-italic') return { 'font-style': c === 'italic' ? 'italic' : 'normal' };
  if (['underline', 'overline', 'line-through', 'no-underline'].includes(c)) return { 'text-decoration-line': c === 'no-underline' ? 'none' : c };
  if (['uppercase', 'lowercase', 'capitalize', 'normal-case'].includes(c)) return { 'text-transform': c === 'normal-case' ? 'none' : c };
  if (c === 'truncate') return { overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' };
  if ((m = /^whitespace-(normal|nowrap|pre|pre-line|pre-wrap|break-spaces)$/.exec(c))) return { 'white-space': m[1] };
  if ((m = /^overflow(?:-([xy]))?-(auto|hidden|clip|visible|scroll)$/.exec(c))) return m[1] ? { [`overflow-${m[1]}`]: m[2] } : { 'overflow-x': m[2], 'overflow-y': m[2] };
  if ((m = /^opacity-(\d+)$/.exec(c)) && [0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100].includes(+m[1])) return { opacity: String(+m[1] / 100) };
  if ((m = /^z-(\d+|auto)$/.exec(c)) && ['0', '10', '20', '30', '40', '50', 'auto'].includes(m[1])) return { 'z-index': m[1] };
  if ((m = /^cursor-(pointer|default|not-allowed|wait|text|move|auto|grab)$/.exec(c))) return { cursor: m[1] };
  if ((m = /^pointer-events-(none|auto)$/.exec(c))) return { 'pointer-events': m[1] };
  if ((m = /^select-(none|text|all|auto)$/.exec(c))) return { 'user-select': m[1] };
  if ((m = /^shadow(?:-(.+))?$/.exec(c)) && SHADOW.includes(m[1] ?? '')) return { 'box-shadow': `theme(boxShadow.${m[1] ?? 'DEFAULT'})` };
  if ((m = /^transition(?:-(all|colors|opacity|shadow|transform|none))?$/.exec(c))) return { 'transition-property': `theme(transitionProperty.${m[1] ?? 'DEFAULT'})`, ...(m[1] === 'none' ? {} : { 'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)', 'transition-duration': '150ms' }) };
  if ((m = /^duration-(\d+)$/.exec(c)) && DURATION.includes(m[1])) return { 'transition-duration': `${m[1]}ms` };
  if ((m = /^ease-(linear|in|out|in-out)$/.exec(c))) return { 'transition-timing-function': { linear: 'linear', in: 'cubic-bezier(0.4, 0, 1, 1)', out: 'cubic-bezier(0, 0, 0.2, 1)', 'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)' }[m[1]] };
  if ((m = /^aspect-(auto|square|video)$/.exec(c))) return { 'aspect-ratio': { auto: 'auto', square: '1 / 1', video: '16 / 9' }[m[1]] };
  if ((m = /^object-(contain|cover|fill|none|scale-down)$/.exec(c))) return { 'object-fit': m[1] };
  if (c === 'sr-only') return { position: 'absolute', width: '1px', height: '1px', 'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px', 'margin-top': '-1px', 'margin-right': '-1px', 'margin-bottom': '-1px', 'margin-left': '-1px', 'overflow-x': 'hidden', 'overflow-y': 'hidden', clip: 'rect(0, 0, 0, 0)', 'white-space': 'nowrap', 'border-top-width': '0px', 'border-right-width': '0px', 'border-bottom-width': '0px', 'border-left-width': '0px' };
  if (c === 'group' || c === 'peer') return { [`--lean-marker-${c}`]: c }; // a marker a descendant's group-hover reads: present or absent is a difference
  return null;
}

// a class string to its declarations per variant ('' for none), with the classes the table does not read and the
// properties two classes write with different values
export function resolveClasses(text) {
  const tokens = String(text).split(/\s+/).filter(Boolean);
  const decls = {}; const unknown = []; const conflicts = [];
  for (const tok of tokens) {
    const parts = tok.split(':'); const base = parts.pop();
    if (parts.length > 1 || base.startsWith('!') || (parts.length === 1 && !Object.hasOwn(VARIANTS, parts[0]))) { unknown.push(tok); continue; } // a stacked variant, an important mark, a variant outside the table
    const d = utility(base); if (!d) { unknown.push(tok); continue; } // outside the table, an opacity modifier (`bg-black/50`) included
    const key = parts.length ? VARIANTS[parts[0]] : '';
    const into = (decls[key] ??= {});
    for (const [p, v] of Object.entries(d)) { if (Object.hasOwn(into, p) && into[p] !== v) { if (!conflicts.includes(`${key}${key ? ' ' : ''}${p}`)) conflicts.push(`${key}${key ? ' ' : ''}${p}`); } else into[p] = v; }
  }
  const sorted = Object.fromEntries(Object.keys(decls).sort().map((k) => [k, Object.fromEntries(Object.keys(decls[k]).sort().map((p) => [p, decls[k][p]]))]));
  return { tokens: [...new Set(tokens)].sort(), decls: sorted, unknown, conflicts };
}

// the styled elements of a rendered tree (an observation's `returned`, element objects with $el, props, children and a
// deep child's `rendered`), in pre-order: an element whose className is a string
export function styledElements(tree, out = []) {
  if (Array.isArray(tree)) { for (const x of tree) styledElements(x, out); return out; }
  if (!tree || typeof tree !== 'object' || !Object.hasOwn(tree, '$el')) return out;
  const cn = tree.props && tree.props.className;
  if (typeof cn === 'string') out.push({ tag: typeof tree.$el === 'string' ? tree.$el : JSON.stringify(tree.$el), className: cn });
  else if (cn !== undefined && cn !== null) out.push({ tag: typeof tree.$el === 'string' ? tree.$el : JSON.stringify(tree.$el), className: null, value: cn }); // a class value that is not a string (a fake, a function result): unknown
  if (Array.isArray(tree.children)) for (const c of tree.children) styledElements(c, out);
  if (Object.hasOwn(tree, 'rendered')) styledElements(tree.rendered, out);
  return out;
}

// one input: the parent's tree against the candidate's tree, element by element in pre-order
export function compareStyles(treeP, treeC) {
  const P = styledElements(treeP), C = styledElements(treeC);
  const unsupported = []; let unknown = false;
  const note = (cls, reason) => { if (!unsupported.some((u) => u.class === cls && u.reason === reason)) unsupported.push({ class: cls, reason }); };
  for (let i = 0; i < Math.max(P.length, C.length); i++) {
    const a = P[i], b = C[i];
    if (!a || !b || a.tag !== b.tag) return { verdict: 'differ', element: i, parent: a ?? null, candidate: b ?? null, why: !a || !b ? 'a styled element on one side only' : 'a different element at this position' };
    if (a.className === null || b.className === null) { if (JSON.stringify(a.value) !== JSON.stringify(b.value)) { unknown = true; note(JSON.stringify(a.value ?? b.value).slice(0, 80), 'unknown: a class value that is not a string'); } continue; }
    const ra = resolveClasses(a.className), rb = resolveClasses(b.className);
    if (JSON.stringify(ra.tokens) === JSON.stringify(rb.tokens)) continue; // the same classes in another order or repeated: equal under any configuration
    const open = [...ra.unknown, ...rb.unknown], clash = [...ra.conflicts, ...rb.conflicts];
    if (open.length || clash.length) { unknown = true; for (const u of open) note(u, 'unknown'); if (ra.conflicts.length) note(a.className, `unknown: two classes write ${ra.conflicts.join(', ')} with different values; the stylesheet order decides`); if (rb.conflicts.length) note(b.className, `unknown: two classes write ${rb.conflicts.join(', ')} with different values; the stylesheet order decides`); continue; }
    if (JSON.stringify(ra.decls) !== JSON.stringify(rb.decls)) return { verdict: 'differ', element: i, tag: a.tag, parent: { className: a.className, declarations: ra.decls }, candidate: { className: b.className, declarations: rb.decls }, why: 'different declarations' };
  }
  return { verdict: unknown ? 'unknown' : 'equal', elements: P.length, unsupported };
}

// the layer over a run: every input both sides rendered, compared; a difference on any input is the layer's WITNESS
export function stylesLayer() {
  let inputs = 0, elements = 0, witness = null; const unsupported = [];
  return {
    add(input, treeP, treeC) {
      inputs++; const r = compareStyles(treeP, treeC);
      if (r.verdict === 'differ') { if (!witness) witness = { input, ...r }; return; }
      elements += r.elements; for (const u of r.unsupported) if (!unsupported.some((x) => x.class === u.class && x.reason === u.reason)) unsupported.push(u);
    },
    result() {
      const verdict = witness ? 'WITNESS' : !inputs ? 'none' : unsupported.length ? 'unknown' : 'PASS-bounded';
      return { verdict, inputs, elementsCompared: elements, ...(witness ? { witness } : {}), unsupported, config: { ...PINNED, project: 'not read' }, assumptions: ['a className string is read as the declarations of its classes under the pinned configuration; the order of classes in the attribute and a repeated class never count', 'only the pinned utilities style these classes: no project stylesheet, no project Tailwind config (theme extensions and overrides are not read), no inline style (inline style stays in the tree layer)', 'equal is per compared element of the one-render tree on each input run, never over the inputs not run nor after a click', 'an unknown class, a variant outside the table, a stacked variant, an important mark, an opacity modifier, or two classes writing one property with different values: the element is unknown, never equal'] };
    },
  };
}

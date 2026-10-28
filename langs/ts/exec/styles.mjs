// The styles layer of a front-end certificate (design/ui-layers.md): a `className` string is read as the set of CSS
// declarations its utility classes produce under lean's pinned Tailwind configuration, not as text. Two class strings
// that resolve to the same declarations are equal in this layer (an order, a duplicate, a shorthand against its
// longhands); a different declaration is a styles WITNESS; a class outside the pinned table, a stacked or unknown
// variant, an opacity modifier, an important mark, or two classes writing one property with different values (the
// stylesheet's order decides, not the attribute's) make the element `unknown`, never equal. Two class strings with the
// same set of tokens are equal under one configuration, so they are equal even when a token is unknown.
//
// The pinned configuration: the Tailwind CSS v3.4 default theme, restricted to the utilities below. Colours resolve to
// the default palette's hex values (the opacity variable v3 writes is the same on every colour, so it is left out).
// The project's own configuration is layered over it (projectConfig below): a v3 `tailwind.config.*` read statically,
// or the v4 `@theme` blocks of the CSS entry that imports tailwindcss; a namespace the reading cannot follow makes the
// utilities it styles unknown.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ts } from '../common.mjs';
import { kidsOf } from '../patch.mjs';

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

// the table a class is read against: the pinned theme, or the pinned theme with a project configuration layered over
// it (projectConfig). `numeric` is v4's spacing rule (any multiple of 0.25 is `calc(<numeric> * n)`); `blocked` holds
// the theme namespaces the project sets and lean does not read, `blockAll` an unreadable configuration; `custom` the
// project's own utility names (`@utility`, a CSS rule on a utility's class), which lean never resolves
const fontDecls = (t) => Object.fromEntries(Object.entries(t).map(([k, [s, lh]]) => [k, { 'font-size': s, 'line-height': lh }]));
const FAMILY = { sans: 'theme(fontFamily.sans)', serif: 'theme(fontFamily.serif)', mono: 'theme(fontFamily.mono)' };
const SHADOWS = Object.fromEntries(SHADOW.map((k) => [k, `theme(boxShadow.${k || 'DEFAULT'})`]));
const BASE = Object.freeze({ form: 'pinned', colors: COLORS, spacing: SPACING, numeric: null, fontSize: fontDecls(FONT_SIZE), fontFamily: FAMILY, radius: RADIUS, maxw: MAXW, shadow: SHADOWS, variants: VARIANTS, blocked: new Set(), blockAll: false, custom: { names: new Set(), prefixes: [] } });
const SCREENS = ['sm', 'md', 'lg', 'xl', '2xl'];

const arbitrary = (v) => { const m = /^\[([^\]\s]+)\]$/.exec(v); return m ? m[1].replace(/_/g, ' ') : null; }; // `[3px]`: the value as written, underscores as spaces
const spacing = (v, neg, T = BASE) => { let x = Object.hasOwn(T.spacing, v) ? T.spacing[v] : T.numeric && /^(0|[1-9]\d*)(\.(25|5|75))?$/.test(v) ? `calc(${T.numeric} * ${v})` : arbitrary(v); if (x === null) return null; if (neg) x = x === '0px' ? '0px' : `-${x}`; return x; };
const size = (v, extra = {}, T = BASE) => (Object.hasOwn(extra, v) ? extra[v] : Object.hasOwn(FRACTIONS, v) ? FRACTIONS[v] : spacing(v, false, T));
const color = (v, T = BASE) => (Object.hasOwn(T.colors, v) ? T.colors[v] : /^\[#[0-9a-fA-F]{3,8}\]$/.test(v) ? v.slice(1, -1).toLowerCase() : T.form === 'v4-theme' && /^\(--[A-Za-z0-9_-]+\)$/.test(v) ? `var(${v.slice(1, -1)})` : null); // v4: `bg-(--x)` is `background-color: var(--x)`
const each = (props, value) => Object.fromEntries(props.map((p) => [p, value]));

// the theme namespaces a declared property reads (v3 names; v4 namespaces map onto them): a utility writing a property of
// a namespace the project sets and lean does not read is unknown
function namespacesOf(p) {
  if (p === 'color') return ['textColor', 'colors'];
  if (p === 'background-color') return ['backgroundColor', 'colors'];
  if (p === 'border-color') return ['borderColor', 'colors'];
  if (/^padding-/.test(p)) return ['padding', 'spacing'];
  if (/^margin-/.test(p)) return ['margin', 'spacing'];
  if (p === 'row-gap' || p === 'column-gap') return ['gap', 'spacing'];
  if (p.startsWith('>')) return ['space', 'spacing'];
  if (['top', 'right', 'bottom', 'left'].includes(p)) return ['inset', 'spacing'];
  if (p === 'width' || p === 'height') return [p, 'size', 'spacing'];
  if (p === 'min-width') return ['minWidth', 'spacing'];
  if (p === 'min-height') return ['minHeight', 'spacing'];
  if (p === 'max-height') return ['maxHeight', 'spacing'];
  if (p === 'max-width') return ['maxWidth'];
  if (p === 'font-size') return ['fontSize'];
  if (p === 'line-height') return ['lineHeight', 'fontSize'];
  if (/^border-.*-radius$/.test(p)) return ['borderRadius'];
  if (/^border-.*-width$/.test(p)) return ['borderWidth'];
  const one = { 'letter-spacing': 'letterSpacing', 'font-weight': 'fontWeight', 'font-family': 'fontFamily', 'box-shadow': 'boxShadow', 'transition-duration': 'transitionDuration', 'transition-property': 'transitionProperty', 'transition-timing-function': 'transitionTimingFunction', opacity: 'opacity', 'z-index': 'zIndex', 'aspect-ratio': 'aspectRatio', 'grid-template-columns': 'gridTemplateColumns', 'grid-column': 'gridColumn', flex: 'flex', 'flex-grow': 'flexGrow', 'flex-shrink': 'flexShrink', cursor: 'cursor' }[p];
  return one ? [one] : [];
}
// one utility (no variant) under a table: its declarations, or null; `blockedBy` names the namespace that made it unknown
function lookup(cls, T) {
  if (T.custom.names.has(cls) || T.custom.prefixes.some((x) => cls.startsWith(x))) return { d: null, blockedBy: 'a project utility of this name' };
  const d = utilityIn(cls, T); if (!d) return { d: null };
  for (const p of Object.keys(d)) { const ns = namespacesOf(p); const hit = T.blockAll ? ns[0] : ns.find((n) => T.blocked.has(n)); if (hit) return { d: null, blockedBy: T.blockAll ? 'the project configuration, which lean cannot read' : `theme ${hit}` }; }
  return { d };
}
// one utility (no variant) to its declarations, or null when it is outside the table (the pinned one by default)
export function utility(cls, T = BASE) { return lookup(cls, T).d; }
function utilityIn(cls, T) {
  const neg = cls.startsWith('-'); const c = neg ? cls.slice(1) : cls;
  let m;
  if (!neg && Object.hasOwn(DISPLAY, c)) return { display: DISPLAY[c] };
  if (!neg && POSITION.includes(c)) return { position: c };
  if ((m = /^(p|m)([trblxy]?)-(.+)$/.exec(c))) { if (neg && m[1] === 'p') return null; const v = m[1] === 'm' && m[3] === 'auto' && !neg ? 'auto' : spacing(m[3], neg, T); if (v === null) return null; return each(SIDES[m[2]].map((s) => `${m[1] === 'p' ? 'padding' : 'margin'}-${s}`), v); }
  if (!neg && (m = /^(p|m)([se])-(.+)$/.exec(c))) { const v = m[1] === 'm' && m[3] === 'auto' ? 'auto' : spacing(m[3], false, T); if (v === null) return null; return { [`${m[1] === 'p' ? 'padding' : 'margin'}-inline-${m[2] === 's' ? 'start' : 'end'}`]: v }; }
  if (!neg && (m = /^gap(-[xy])?-(.+)$/.exec(c))) { const v = spacing(m[2], false, T); if (v === null) return null; return m[1] === '-x' ? { 'column-gap': v } : m[1] === '-y' ? { 'row-gap': v } : { 'row-gap': v, 'column-gap': v }; }
  if ((m = /^space-([xy])-(.+)$/.exec(c))) { const v = spacing(m[2], neg, T); if (v === null) return null; return { [`> :not([hidden]) ~ :not([hidden]) margin-${m[1] === 'x' ? 'left' : 'top'}`]: v }; }
  if ((m = /^(inset|top|right|bottom|left)(-[xy])?-(.+)$/.exec(c))) { const raw = m[3]; const v = raw === 'auto' && !neg ? 'auto' : neg ? spacing(raw, true, T) ?? (Object.hasOwn(FRACTIONS, raw) ? `-${FRACTIONS[raw]}` : null) : size(raw, {}, T); if (v === null) return null; const sides = m[1] === 'inset' ? (m[2] === '-x' ? ['left', 'right'] : m[2] === '-y' ? ['top', 'bottom'] : ['top', 'right', 'bottom', 'left']) : m[2] ? null : [m[1]]; return sides ? each(sides, v) : null; }
  if (neg) return null;
  if ((m = /^(w|h|size)-(.+)$/.exec(c))) { const v = size(m[2], { auto: 'auto', screen: m[1] === 'h' ? '100vh' : '100vw', min: 'min-content', max: 'max-content', fit: 'fit-content' }, T); if (v === null || (m[1] === 'size' && m[2] === 'screen')) return null; return m[1] === 'w' ? { width: v } : m[1] === 'h' ? { height: v } : { width: v, height: v }; }
  if ((m = /^(min|max)-(w|h)-(.+)$/.exec(c))) { const prop = `${m[1]}-${m[2] === 'w' ? 'width' : 'height'}`; const v = m[1] === 'max' && m[2] === 'w' ? (Object.hasOwn(T.maxw, m[3]) ? T.maxw[m[3]] : arbitrary(m[3])) : size(m[3], { full: '100%', screen: m[2] === 'h' ? '100vh' : '100vw', min: 'min-content', max: 'max-content', fit: 'fit-content', none: 'none' }, T); return v === null ? null : { [prop]: v }; }
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
    if (Object.hasOwn(T.fontSize, m[1])) return { ...T.fontSize[m[1]] };
    if (['left', 'center', 'right', 'justify', 'start', 'end'].includes(m[1])) return { 'text-align': m[1] };
    const col = color(m[1], T); return col === null ? null : { color: col };
  }
  if ((m = /^bg-(.+)$/.exec(c))) { const col = color(m[1], T); return col === null ? null : { 'background-color': col }; }
  if ((m = /^border-(.+)$/.exec(c)) && color(m[1], T) !== null) return { 'border-color': color(m[1], T) };
  if ((m = /^border(?:-([trblxy]))?(?:-(0|2|4|8))?$/.exec(c))) return each(SIDES[m[1] ?? ''].map((s) => `border-${s}-width`), `${m[2] ?? 1}px`);
  if ((m = /^border-(solid|dashed|dotted|double|none)$/.exec(c))) return { 'border-style': m[1] };
  if ((m = /^rounded(?:-(t|r|b|l|tl|tr|br|bl))?(?:-(.+))?$/.exec(c)) && Object.hasOwn(T.radius, m[2] ?? '')) return each(CORNERS[m[1] ?? ''].map((k) => `border-${k}-radius`), T.radius[m[2] ?? '']);
  if ((m = /^font-(.+)$/.exec(c))) { if (Object.hasOwn(WEIGHT, m[1])) return { 'font-weight': WEIGHT[m[1]] }; if (Object.hasOwn(T.fontFamily, m[1])) return { 'font-family': T.fontFamily[m[1]] }; return null; }
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
  if ((m = /^shadow(?:-(.+))?$/.exec(c)) && Object.hasOwn(T.shadow, m[1] ?? '')) return { 'box-shadow': T.shadow[m[1] ?? ''] };
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
export function resolveClasses(text, T = BASE) {
  const tokens = String(text).split(/\s+/).filter(Boolean);
  const decls = {}; const unknown = []; const conflicts = []; const blocked = {}; // blocked: a token the table reads but the project configuration may restyle, with the namespace
  for (const tok of tokens) {
    const parts = tok.split(':'); const base = parts.pop();
    if (parts.length > 1 || base.startsWith('!') || (parts.length === 1 && !Object.hasOwn(T.variants, parts[0]))) { unknown.push(tok); continue; } // a stacked variant, an important mark, a variant outside the table
    const { d, blockedBy } = lookup(base, T); if (!d) { unknown.push(tok); if (blockedBy) blocked[tok] = blockedBy; continue; } // outside the table, an opacity modifier (`bg-black/50`) included
    const key = parts.length ? T.variants[parts[0]] : '';
    const into = (decls[key] ??= {});
    for (const [p, v] of Object.entries(d)) { if (Object.hasOwn(into, p) && into[p] !== v) { if (!conflicts.includes(`${key}${key ? ' ' : ''}${p}`)) conflicts.push(`${key}${key ? ' ' : ''}${p}`); } else into[p] = v; }
  }
  const sorted = Object.fromEntries(Object.keys(decls).sort().map((k) => [k, Object.fromEntries(Object.keys(decls[k]).sort().map((p) => [p, decls[k][p]]))]));
  return { tokens: [...new Set(tokens)].sort(), decls: sorted, unknown, conflicts, blocked };
}

// the styled elements of a rendered tree (an observation's `returned`, element objects with $el, props, children and a
// deep child's `rendered`), in pre-order: an element whose className is a string
export function styledElements(tree, out = []) {
  if (Array.isArray(tree)) { for (const x of tree) styledElements(x, out); return out; }
  if (!tree || typeof tree !== 'object' || !Object.hasOwn(tree, '$el')) return out;
  const cn = tree.props && tree.props.className;
  if (typeof cn === 'string') out.push({ tag: typeof tree.$el === 'string' ? tree.$el : JSON.stringify(tree.$el), className: cn });
  else if (cn !== undefined && cn !== null) out.push({ tag: typeof tree.$el === 'string' ? tree.$el : JSON.stringify(tree.$el), className: null, value: cn }); // a class value that is not a string (a fake, a function result): unknown
  for (const c of kidsOf(tree.children)) styledElements(c, out);
  if (Object.hasOwn(tree, 'rendered')) styledElements(tree.rendered, out);
  return out;
}

// one input: the parent's tree against the candidate's tree, element by element in pre-order, each side's classes read
// under its own configuration (cp, cc: projectConfig results); two sides with one configuration share the token rule
export function compareStyles(treeP, treeC, cp = PINNED_CONFIG, cc = cp) {
  const P = styledElements(treeP), C = styledElements(treeC);
  const same = cp.key === cc.key;
  const unsupported = []; let unknown = false;
  const note = (cls, reason) => { if (!unsupported.some((u) => u.class === cls && u.reason === reason)) unsupported.push({ class: cls, reason }); };
  for (let i = 0; i < Math.max(P.length, C.length); i++) {
    const a = P[i], b = C[i];
    if (!a || !b || a.tag !== b.tag) return { verdict: 'differ', element: i, parent: a ?? null, candidate: b ?? null, why: !a || !b ? 'a styled element on one side only' : 'a different element at this position' };
    if (a.className === null || b.className === null) { if (JSON.stringify(a.value) !== JSON.stringify(b.value)) { unknown = true; note(JSON.stringify(a.value ?? b.value).slice(0, 80), 'unknown: a class value that is not a string'); } continue; }
    const ra = resolveClasses(a.className, cp.table), rb = resolveClasses(b.className, cc.table);
    if (same && JSON.stringify(ra.tokens) === JSON.stringify(rb.tokens)) continue; // the same classes in another order or repeated: equal under one configuration
    const open = [...ra.unknown, ...rb.unknown], clash = [...ra.conflicts, ...rb.conflicts];
    if (open.length || clash.length) { unknown = true; for (const u of open) note(u, ra.blocked[u] ?? rb.blocked[u] ? `unknown: the project configuration sets ${ra.blocked[u] ?? rb.blocked[u]}, which lean does not read` : 'unknown'); if (ra.conflicts.length) note(a.className, `unknown: two classes write ${ra.conflicts.join(', ')} with different values; the stylesheet order decides`); if (rb.conflicts.length) note(b.className, `unknown: two classes write ${rb.conflicts.join(', ')} with different values; the stylesheet order decides`); continue; }
    if (JSON.stringify(ra.decls) !== JSON.stringify(rb.decls)) return { verdict: 'differ', element: i, tag: a.tag, parent: { className: a.className, declarations: ra.decls, ...tokenValues(ra.decls, cp.table) }, candidate: { className: b.className, declarations: rb.decls, ...tokenValues(rb.decls, cc.table) }, why: same ? 'different declarations' : 'different declarations, each side under its own project configuration' };
  }
  return { verdict: unknown ? 'unknown' : 'equal', elements: P.length, unsupported };
}

// the project tokens a v4 declaration reads (`var(--color-brand-500)`), with the value its @theme block gives
const tokenValues = (decls, T) => { if (!T.values) return {}; const out = {}; for (const m of JSON.stringify(decls).matchAll(/var\((--[A-Za-z0-9_.-]+)/g)) if (Object.hasOwn(T.values, m[1])) out[m[1]] = T.values[m[1]]; return Object.keys(out).length ? { tokens: out } : {}; };

// the layer over a run: every input both sides rendered, compared; a difference on any input is the layer's WITNESS.
// configs: the project configuration of each side's file (projectConfig), the pinned table alone when not given
export function stylesLayer(configs = null) {
  const cp = configs?.parent ?? PINNED_CONFIG, cc = configs?.candidate ?? cp;
  let inputs = 0, elements = 0, witness = null; const unsupported = [];
  return {
    add(input, treeP, treeC) {
      inputs++; const r = compareStyles(treeP, treeC, cp, cc);
      if (r.verdict === 'differ') { if (!witness) witness = { input, ...r }; return; }
      elements += r.elements; for (const u of r.unsupported) if (!unsupported.some((x) => x.class === u.class && x.reason === u.reason)) unsupported.push(u);
    },
    result() {
      const verdict = witness ? 'WITNESS' : !inputs ? 'none' : unsupported.length ? 'unknown' : 'PASS-bounded';
      const project = cp.key === cc.key ? cp.project : { parent: cp.project, candidate: cc.project };
      const read = [cp, cc].find((x) => typeof x.project === 'object' && x.project.form);
      const scope = read ? `the utilities of exec/styles.mjs over the project's theme (${read.project.form}, ${read.project.path})${cp.key === cc.key ? '' : ', each side under its own configuration'}; every other class is unknown` : PINNED.scope;
      return { verdict, inputs, elementsCompared: elements, ...(witness ? { witness } : {}), unsupported, config: { ...PINNED, scope, ...(read?.table.form === 'v4-theme' ? { values: V4_VALUES } : {}), project }, assumptions: ['a className string is read as the declarations of its classes under the configuration named in config; the order of classes in the attribute and a repeated class never count', read ? `the project's theme is read as written (${read.project.form}: ${read.project.form === 'v3-config' ? 'theme and theme.extend of the config file, read as a literal, no project code run' : 'the @theme blocks of the CSS entry and the files it imports'}); a namespace it sets and lean does not read makes the utilities it styles unknown; the project's other stylesheets, a plugin's utilities and an inline style are not read` : 'only the pinned utilities style these classes: no project stylesheet, no project Tailwind config was found or read, no inline style (inline style stays in the tree layer)', 'equal is per compared element of the one-render tree on each input run, never over the inputs not run nor after a click', 'an unknown class, a variant outside the table, a stacked variant, an important mark, an opacity modifier, or two classes writing one property with different values: the element is unknown, never equal'] };
    },
  };
}

// ---- the project's own configuration (design/ui-layers.md, "The project's theme") ----
// A unit's file belongs to the project of the nearest directory above it holding a package.json or a .git. Walking up
// from the file to that root, the first directory holding a `tailwind.config.{js,cjs,mjs,ts,cts,mts}` gives the v3 form;
// else the first holding a CSS file that imports tailwindcss (the project root is searched below too) gives the v4 form.
// Neither: the pinned table alone. Nothing of the project runs: a config file is read as a literal (ts parse), a
// stylesheet as text.
const PINNED_CONFIG = Object.freeze({ key: 'pinned', table: BASE, project: 'not read' });
const V4_VALUES = 'a theme-keyed value is written as v4 emits it: var(--color-*), calc(var(--spacing) * n), var(--text-*), var(--font-*), var(--radius-*), var(--shadow-*), var(--container-*); so an arbitrary value never equals a token, whatever the variable holds at run time';
const CONFIG_NAMES = ['tailwind.config.js', 'tailwind.config.cjs', 'tailwind.config.mjs', 'tailwind.config.ts', 'tailwind.config.cts', 'tailwind.config.mts'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', 'out', '.git', 'coverage', '.turbo', '.vercel']);
const sha16 = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);
const IMPORTS_TAILWIND = /@import\s+(?:url\(\s*)?["']tailwindcss(?:\/[^"']*)?["']/;
const configCache = new Map();
export function projectConfig(file) {
  if (!file || !fs.existsSync(file)) return PINNED_CONFIG;
  const dir = path.dirname(path.resolve(file));
  if (!configCache.has(dir)) { let c; try { c = findConfig(dir); } catch (e) { c = unreadable(null, null, `the configuration search failed: ${String(e && e.message).slice(0, 160)}`); } configCache.set(dir, c); }
  return configCache.get(dir);
}
function findConfig(start) {
  let root = start; for (let d = start; ; d = path.dirname(d)) { if (fs.existsSync(path.join(d, 'package.json')) || fs.existsSync(path.join(d, '.git'))) { root = d; break; } if (path.dirname(d) === d) { root = d; break; } }
  for (let d = start; ; d = path.dirname(d)) {
    for (const n of CONFIG_NAMES) { const p = path.join(d, n); if (fs.existsSync(p) && fs.statSync(p).isFile()) return readV3(p); }
    const own = cssFiles(d, false).filter((p) => IMPORTS_TAILWIND.test(readText(p)));
    const entries = own.length || d !== root || !fs.existsSync(path.join(d, 'package.json')) ? own : cssFiles(d, true).filter((p) => IMPORTS_TAILWIND.test(readText(p)));
    if (entries.length > 1) return unreadable(entries[0], 'v4-theme', `${entries.length} CSS files import tailwindcss (${entries.map((p) => path.relative(d, p)).join(', ')}): which one styles this file is not read`);
    if (entries.length === 1) return readV4(entries[0]);
    if (d === root) return { ...PINNED_CONFIG, project: `none found: no tailwind.config.* and no CSS file importing tailwindcss between the file and its project root ${root}` };
  }
}
const readText = (p) => { try { const st = fs.statSync(p); return st.isFile() && st.size < 2_000_000 ? fs.readFileSync(p, 'utf8') : ''; } catch { return ''; } };
function cssFiles(dir, deep, out = [], budget = { dirs: 5000 }) { // at most 5,000 folders below a project root
  if (--budget.dirs < 0) return out;
  let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) { const p = path.join(dir, e.name); if (e.isFile() && e.name.endsWith('.css')) out.push(p); else if (deep && e.isDirectory() && !SKIP_DIRS.has(e.name) && !e.name.startsWith('.') && !fs.existsSync(path.join(p, 'package.json'))) cssFiles(p, true, out, budget); } // a folder with its own package.json is another project
  return out.sort();
}
// an unreadable configuration: every utility a theme namespace styles is unknown; the static ones (display, position,
// alignment) keep their reading
function unreadable(p, form, why) { return { key: `unreadable:${p ? sha16(readText(p)) : 'search'}:${why}`, table: { ...BASE, form: form ?? 'pinned', blockAll: true }, project: `unreadable: ${why}${p ? ` (${p})` : ''}` }; }
const freshTable = (form) => ({ form, colors: { ...COLORS }, spacing: { ...SPACING }, numeric: null, fontSize: fontDecls(FONT_SIZE), fontFamily: { ...FAMILY }, radius: { ...RADIUS }, maxw: { ...MAXW }, shadow: { ...SHADOWS }, variants: { ...VARIANTS }, blocked: new Set(), blockAll: false, custom: { names: new Set(), prefixes: [] } });

// ---- v3: tailwind.config.* read as a literal ----
// The exported object (module.exports = …, export default …) is read through object and array literals, strings,
// numbers, top-level consts and spreads of readable objects; anything else (a call, a function, a require, an import)
// is a value lean does not read. A top-level statement that could change the object (a call, an assignment) makes the
// whole file unreadable. theme.{colors, spacing, fontSize, fontFamily, borderRadius, boxShadow, screens} and their extend are read; any other
// theme key the file sets makes the utilities of that namespace unknown.
const UNREAD = Symbol('unread');
const unreadValue = (why) => ({ [UNREAD]: why });
const isUnread = (x) => !!x && typeof x === 'object' && Object.hasOwn(x, UNREAD);
const put = (o, k, v) => Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
const keyText = (n) => (ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ? n.text : ts.isNumericLiteral(n) ? String(Number(n.text)) : ts.isComputedPropertyName(n) && (ts.isStringLiteral(n.expression) || ts.isNumericLiteral(n.expression)) ? keyText(n.expression) : null);
function literalOf(node, consts, depth = 0) {
  if (depth > 60) return unreadValue('nested too deep');
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(node)) || ts.isNonNullExpression(node) || (ts.isTypeAssertionExpression && ts.isTypeAssertionExpression(node))) node = node.expression;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) return -Number(node.operand.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) { const out = []; for (const e of node.elements) { if (ts.isSpreadElement(e)) return unreadValue(`a spread in an array: ${e.getText().slice(0, 60)}`); out.push(literalOf(e, consts, depth + 1)); } return out; }
  if (ts.isObjectLiteralExpression(node)) {
    const out = {};
    for (const p of node.properties) {
      if (ts.isPropertyAssignment(p)) { const k = keyText(p.name); if (k === null) return unreadValue(`a computed key: ${p.name.getText().slice(0, 60)}`); put(out, k, literalOf(p.initializer, consts, depth + 1)); }
      else if (ts.isShorthandPropertyAssignment(p)) put(out, p.name.text, literalOf(p.name, consts, depth + 1));
      else if (ts.isSpreadAssignment(p)) { const v = literalOf(p.expression, consts, depth + 1); if (isUnread(v) || !v || typeof v !== 'object' || Array.isArray(v)) return unreadValue(`a spread of ${p.expression.getText().slice(0, 60)}`); for (const [k, x] of Object.entries(v)) put(out, k, x); }
      else { const k = p.name ? keyText(p.name) : null; if (k === null) return unreadValue('a member lean does not read'); put(out, k, unreadValue(`a ${ts.SyntaxKind[p.kind]}`)); }
    }
    return out;
  }
  if (ts.isIdentifier(node)) { const c = consts.get(node.text); if (c && !c.busy) { c.busy = true; try { return literalOf(c.init, consts, depth + 1); } finally { c.busy = false; } } return unreadValue(`the name ${node.text}`); }
  return unreadValue(`code: ${node.getText().replace(/\s+/g, ' ').slice(0, 80)}`);
}
const isExportsTarget = (n) => ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'module' && n.name.text === 'exports';
// the exported object of a config file, or { why } when the file computes it
export function readConfigLiteral(p) {
  const text = readText(p);
  const sf = ts.createSourceFile(p, text, ts.ScriptTarget.Latest, true, /\.[cm]?ts$/.test(p) ? ts.ScriptKind.TS : ts.ScriptKind.JS);
  const consts = new Map(); let exported = null;
  const scan = (n) => { // a statement that could change an object at load: a call other than require('<literal>'), new, an assignment, delete, ++/--
    if (ts.isFunctionLike(n) && n.body) return null;
    if (ts.isCallExpression(n) && !(ts.isIdentifier(n.expression) && n.expression.text === 'require' && n.arguments.length === 1 && ts.isStringLiteral(n.arguments[0]))) return n;
    if (ts.isNewExpression(n) || ts.isDeleteExpression(n) || ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(n.operator))) return n;
    if (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment && !isExportsTarget(n.left)) return n;
    return ts.forEachChild(n, scan) ?? null;
  };
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) || ts.isFunctionDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isEmptyStatement(st)) continue;
    if (ts.isExpressionStatement(st) && ts.isStringLiteral(st.expression)) continue; // 'use strict'
    const bad = scan(st); if (bad) return { why: `the file runs code at load: ${bad.getText().replace(/\s+/g, ' ').slice(0, 80)}` };
    if (ts.isVariableStatement(st)) { if (st.declarationList.flags & ts.NodeFlags.Const) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer) consts.set(d.name.text, { init: d.initializer, busy: false }); continue; }
    if (ts.isExportAssignment(st)) { exported = st.expression; continue; }
    if (ts.isExpressionStatement(st) && ts.isBinaryExpression(st.expression) && st.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken && isExportsTarget(st.expression.left)) { exported = st.expression.right; continue; }
    return { why: `a top-level statement lean does not read: ${st.getText().replace(/\s+/g, ' ').slice(0, 80)}` };
  }
  if (!exported) return { why: 'no module.exports = … and no export default' };
  const v = literalOf(exported, consts);
  if (isUnread(v)) return { why: `the exported config is ${v[UNREAD]}` };
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { why: 'the export is not an object' };
  return { value: v };
}
const V3_READ = new Set(['colors', 'spacing', 'fontSize', 'fontFamily', 'borderRadius', 'boxShadow', 'screens']);
function readV3(p) {
  const text = readText(p); const sha = sha16(text);
  const lit = readConfigLiteral(p);
  if (lit.why) return unreadable(p, 'v3-config', lit.why);
  const cfg = lit.value; const unread = []; let tokens = 0;
  if (Object.hasOwn(cfg, 'presets') && !(Array.isArray(cfg.presets) && !cfg.presets.length)) return unreadable(p, 'v3-config', 'presets: a preset is another configuration');
  if (Object.hasOwn(cfg, 'prefix') && cfg.prefix !== '') return unreadable(p, 'v3-config', 'prefix: every utility takes the prefix');
  if (Object.hasOwn(cfg, 'separator') && cfg.separator !== ':') return unreadable(p, 'v3-config', 'separator: variants use another separator');
  for (const k of ['plugins', 'corePlugins', 'important', 'blocklist']) if (Object.hasOwn(cfg, k) && !(Array.isArray(cfg[k]) && !cfg[k].length)) unread.push(k);
  const theme = Object.hasOwn(cfg, 'theme') ? cfg.theme : {};
  if (isUnread(theme) || !theme || typeof theme !== 'object') return unreadable(p, 'v3-config', `theme is ${isUnread(theme) ? theme[UNREAD] : 'not an object'}`);
  const T = freshTable('v3-config');
  if (cfg.darkMode === 'class' || cfg.darkMode === 'selector' || (Array.isArray(cfg.darkMode) && (cfg.darkMode[0] === 'class' || cfg.darkMode[0] === 'selector'))) T.variants.dark = '.dark *';
  const block = (k, where) => { T.blocked.add(k); unread.push(where); };
  const apply = (k, v, extend) => {
    const where = `theme${extend ? '.extend' : ''}.${k}`;
    if (!V3_READ.has(k)) return block(k, where);
    if (isUnread(v) || !v || typeof v !== 'object' || Array.isArray(v)) return block(k, `${where} (${isUnread(v) ? v[UNREAD] : 'not an object'})`);
    if (k === 'colors') {
      const flat = {}; let bad = null;
      const walk = (o, pre) => { for (const [n, x] of Object.entries(o)) { const name = n === 'DEFAULT' ? pre : pre ? `${pre}-${n}` : n; if (typeof x === 'string') flat[name] = /^#[0-9a-fA-F]{3,8}$/.test(x) ? x.toLowerCase() : x; else if (x && typeof x === 'object' && !Array.isArray(x) && !isUnread(x)) walk(x, name); else bad ??= `${name}: ${isUnread(x) ? x[UNREAD] : typeof x}`; } };
      walk(v, ''); if (bad) return block(k, `${where} (${bad})`);
      if (!extend) T.colors = {}; Object.assign(T.colors, flat); tokens += Object.keys(flat).length;
    } else if (k === 'spacing' || k === 'borderRadius' || k === 'boxShadow' || k === 'fontFamily') {
      const into = {}; for (const [n, x0] of Object.entries(v)) { const x = k === 'fontFamily' && Array.isArray(x0) && x0.every((f) => typeof f === 'string') ? x0.join(', ') : x0; if (typeof x !== 'string' && typeof x !== 'number') return block(k, `${where} (${n}: ${isUnread(x) ? x[UNREAD] : typeof x})`); into[(k === 'borderRadius' || k === 'boxShadow') && n === 'DEFAULT' ? '' : n] = String(x); }
      const target = { spacing: 'spacing', borderRadius: 'radius', boxShadow: 'shadow', fontFamily: 'fontFamily' }[k]; if (!extend) T[target] = {}; Object.assign(T[target], into); tokens += Object.keys(into).length;
    } else if (k === 'fontSize') {
      const into = {};
      for (const [n, x] of Object.entries(v)) {
        const s = Array.isArray(x) ? x[0] : x, more = Array.isArray(x) ? x[1] : undefined;
        if (typeof s !== 'string') return block(k, `${where} (${n}: not a size)`);
        const d = { 'font-size': s };
        if (typeof more === 'string') d['line-height'] = more;
        else if (more && typeof more === 'object' && !isUnread(more)) { for (const [a, b] of [['lineHeight', 'line-height'], ['letterSpacing', 'letter-spacing'], ['fontWeight', 'font-weight']]) if (Object.hasOwn(more, a)) { if (typeof more[a] !== 'string' && typeof more[a] !== 'number') return block(k, `${where} (${n}.${a})`); d[b] = String(more[a]); } }
        else if (more !== undefined) return block(k, `${where} (${n}: ${isUnread(more) ? more[UNREAD] : typeof more})`);
        into[n] = d;
      }
      if (!extend) T.fontSize = {}; Object.assign(T.fontSize, into); tokens += Object.keys(into).length;
    } else if (k === 'screens') {
      const into = {};
      for (const [n, x] of Object.entries(v)) { const min = typeof x === 'string' ? x : x && typeof x === 'object' && !isUnread(x) && Object.keys(x).join() === 'min' && typeof x.min === 'string' ? x.min : null; if (min === null) { for (const s of [...SCREENS, ...Object.keys(v)]) delete T.variants[s]; return block(k, `${where} (${n}: a screen lean does not read)`); } into[n] = `@media (min-width: ${min})`; }
      if (!extend) for (const s of SCREENS) delete T.variants[s];
      Object.assign(T.variants, into); tokens += Object.keys(into).length;
    }
  };
  for (const [k, v] of Object.entries(theme)) if (k !== 'extend') apply(k, v, false);
  if (Object.hasOwn(theme, 'extend')) { const ext = theme.extend; if (isUnread(ext) || !ext || typeof ext !== 'object') return unreadable(p, 'v3-config', `theme.extend is ${isUnread(ext) ? ext[UNREAD] : 'not an object'}`); for (const [k, v] of Object.entries(ext)) apply(k, v, true); }
  return { key: `v3-config:${sha}`, table: T, project: { path: p, sha256: sha, form: 'v3-config', tokens, ...(unread.length ? { unread } : {}) } };
}

// ---- v4: the @theme blocks of the CSS entry and the files it imports ----
// The entry imports tailwindcss (its default theme: the pinned table, written in v4's var form); every other @import is
// read in order, a relative one from its own folder, a package one from the nearest node_modules (one that is not there
// is named in `unread`); the @theme blocks of each file follow its imports. `@theme inline` writes a token's value;
// otherwise a utility reads the variable, as v4 emits it. A `--<namespace>-*: initial` removes that namespace; a
// namespace lean does not read makes its utilities unknown; `@utility` names and a CSS rule on a utility's class make
// those classes unknown; `@config` and a prefix make the configuration unreadable.
const V4_UNREAD = [['--font-weight', 'fontWeight'], ['--leading', 'lineHeight'], ['--tracking', 'letterSpacing'], ['--ease', 'transitionTimingFunction'], ['--default-transition-duration', 'transitionDuration'], ['--default-transition-timing-function', 'transitionTimingFunction'], ['--aspect', 'aspectRatio']];
const V4_RADIUS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
const V4_CONTAINER = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl'];
function v4Base() {
  const T = freshTable('v4-theme');
  for (const k of Object.keys(T.colors)) T.colors[k] = k === 'transparent' ? 'transparent' : k === 'current' ? 'currentcolor' : k === 'inherit' ? 'inherit' : `var(--color-${k})`;
  T.spacing = { px: '1px' }; T.numeric = 'var(--spacing)';
  T.fontSize = Object.fromEntries(Object.keys(FONT_SIZE).map((k) => [k, { 'font-size': `var(--text-${k})`, 'line-height': `var(--tw-leading, var(--text-${k}--line-height))` }]));
  T.radius = { none: '0', full: 'calc(infinity * 1px)', ...Object.fromEntries(V4_RADIUS.map((k) => [k, `var(--radius-${k})`])) }; // the bare `rounded` and `shadow` changed meaning in v4: unknown
  for (const k of V4_CONTAINER) T.maxw[k] = `var(--container-${k})`;
  T.fontFamily = Object.fromEntries(Object.keys(FAMILY).map((k) => [k, `var(--font-${k})`]));
  T.shadow = { none: '0 0 #0000', ...Object.fromEntries(['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'].map((k) => [k, `var(--shadow-${k})`])) }; // v4's scale; `shadow-inner` is gone
  return T;
}
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
// the blocks `@<at> <prelude> { body }` of a stylesheet, braces matched
function atBlocks(text, at) {
  const out = []; const re = new RegExp(`@${at}\\b([^{;]*)\\{`, 'g'); let m;
  while ((m = re.exec(text))) { let depth = 1, i = re.lastIndex; for (; i < text.length && depth; i++) { if (text[i] === '{') depth++; else if (text[i] === '}') depth--; } out.push({ prelude: m[1].trim(), body: text.slice(re.lastIndex, i - 1), start: m.index, end: i }); re.lastIndex = i; }
  return out;
}
function readV4(entry) {
  const files = []; const unread = []; const decls = []; const restyled = new Set(); const customs = new Set(); const seen = new Set();
  let why = null;
  const visit = (file, depth) => {
    if (seen.has(file) || why) return; seen.add(file);
    if (depth > 12) { unread.push(`${file}: imports nested too deep`); return; }
    const raw = readText(file); files.push({ path: file, sha256: sha16(raw) });
    const text = stripComments(raw);
    if (/@config\b/.test(text)) { why = `@config in ${file}: a JavaScript config inside a v4 entry`; return; }
    for (const m of text.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?([^;]*);/g)) {
      const spec = m[1];
      if (/^tailwindcss(\/|$)/.test(spec)) { if (/prefix\(/.test(m[2])) { why = `the tailwindcss import takes a prefix (${m[2].trim()})`; return; } continue; }
      let target = null;
      if (spec.startsWith('.') || spec.startsWith('/')) target = path.resolve(path.dirname(file), spec);
      else for (let d = path.dirname(file); ; d = path.dirname(d)) { const c = path.join(d, 'node_modules', spec); if (readText(c)) { target = c; break; } if (path.dirname(d) === d) break; }
      if (target && !target.endsWith('.css') && readText(`${target}.css`)) target = `${target}.css`;
      if (!target || !readText(target)) { unread.push(`@import "${spec}" (from ${path.basename(file)}): not found`); continue; }
      visit(target, depth + 1); if (why) return;
    }
    const themes = atBlocks(text, 'theme');
    for (const b of themes) {
      const inline = /\binline\b/.test(b.prelude);
      const body = b.body.replace(/\{[^{}]*\}/g, ''); // a nested block (@keyframes) inside @theme defines no token
      for (const part of body.split(';')) { const mm = /^\s*(--[A-Za-z0-9_*.-]+)\s*:\s*([\s\S]*?)\s*$/.exec(part); if (mm) decls.push({ name: mm[1], value: mm[2].replace(/\s*!important$/, ''), inline, file }); }
    }
    for (const u of atBlocks(text, 'utility')) { const n = u.prelude.trim(); if (n.endsWith('-*')) customs.add(n.slice(0, -1)); else customs.add(n); }
    let rest = text; for (const b of [...themes].reverse()) rest = rest.slice(0, b.start) + rest.slice(b.end);
    for (const m of rest.matchAll(/\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g)) if (utility(m[1])) restyled.add(m[1]); // a project rule on a utility's class: the class is the project's
    for (const m of text.matchAll(/@plugin\s+["']([^"']+)["']/g)) unread.push(`@plugin "${m[1]}": its utilities are not read`);
  };
  visit(entry, 0);
  const shaAll = sha16(files.map((f) => f.sha256).join(','));
  if (why) return unreadable(entry, 'v4-theme', why);
  const T = v4Base(); const text = {}; let tokens = 0; T.values = {};
  const reset = (ns) => {
    if (ns === '--color') T.colors = Object.fromEntries(Object.entries(T.colors).filter(([k]) => ['transparent', 'current', 'inherit'].includes(k)));
    else if (ns === '--spacing') { T.spacing = { px: '1px' }; T.numeric = null; }
    else if (ns === '--text') { T.fontSize = {}; for (const k of Object.keys(text)) delete text[k]; }
    else if (ns === '--radius') T.radius = { none: T.radius.none, full: T.radius.full };
    else if (ns === '--breakpoint') for (const s of Object.keys(T.variants)) { if (/^@media \(min-width/.test(T.variants[s])) delete T.variants[s]; }
    else if (ns === '--container') { for (const k of V4_CONTAINER) delete T.maxw[k]; }
    else if (ns === '--font') T.fontFamily = {};
    else if (ns === '--shadow') T.shadow = { none: T.shadow.none };
    else { const hit = V4_UNREAD.find(([pre]) => ns === pre); if (hit) { T.blocked.add(hit[1]); unread.push(`${ns}-*: initial`); } }
  };
  for (const { name, value, inline } of decls) {
    if (value === 'initial') delete T.values[name]; else if (!name.endsWith('*')) T.values[name] = value;
    if (name === '--*') { if (value === 'initial') { for (const ns of ['--color', '--spacing', '--text', '--radius', '--breakpoint', '--container', '--font', '--shadow']) reset(ns); for (const [, n] of V4_UNREAD) T.blocked.add(n); unread.push('--*: initial'); } continue; }
    if (name.endsWith('-*')) { if (value === 'initial') reset(name.slice(0, -2)); continue; }
    let m;
    if ((m = /^--color-(.+)$/.exec(name))) { if (value === 'initial') delete T.colors[m[1]]; else { T.colors[m[1]] = inline ? value : `var(${name})`; tokens++; } continue; }
    if (name === '--spacing') { if (value === 'initial') T.numeric = null; else T.numeric = inline ? value : 'var(--spacing)'; continue; }
    if ((m = /^--spacing-(.+)$/.exec(name))) { if (value === 'initial') delete T.spacing[m[1]]; else { T.spacing[m[1]] = inline ? value : `var(${name})`; tokens++; } continue; }
    if ((m = /^--text-(.+?)(--(line-height|letter-spacing|font-weight))?$/.exec(name))) { const t = (text[m[1]] ??= {}); if (value === 'initial') { delete text[m[1]]; delete T.fontSize[m[1]]; } else t[m[3] ?? 'size'] = { value, inline }; continue; }
    if (name === '--radius' || (m = /^--radius-(.+)$/.exec(name))) { const k = m ? m[1] : ''; if (value === 'initial') delete T.radius[k]; else { T.radius[k] = inline ? value : `var(${name})`; tokens++; } continue; }
    if ((m = /^--breakpoint-(.+)$/.exec(name))) { if (value === 'initial') delete T.variants[m[1]]; else { T.variants[m[1]] = `@media (min-width: ${value})`; tokens++; } continue; }
    if ((m = /^--font-(.+)$/.exec(name)) && !name.startsWith('--font-weight')) { if (value === 'initial') delete T.fontFamily[m[1]]; else { T.fontFamily[m[1]] = inline ? value : `var(${name})`; tokens++; } continue; }
    if ((m = /^--shadow-(.+)$/.exec(name))) { if (value === 'initial') delete T.shadow[m[1]]; else { T.shadow[m[1]] = inline ? value : `var(${name})`; tokens++; } continue; }
    if ((m = /^--container-(.+)$/.exec(name))) { if (value === 'initial') delete T.maxw[m[1]]; else { T.maxw[m[1]] = inline ? value : `var(${name})`; tokens++; } continue; }
    const hit = V4_UNREAD.find(([pre]) => name === pre || name.startsWith(`${pre}-`));
    if (hit) { T.blocked.add(hit[1]); if (!unread.includes(`${hit[0]}-*`)) unread.push(`${hit[0]}-*`); }
  }
  for (const [k, t] of Object.entries(text)) { // a --text-<k> token and its --line-height, --letter-spacing, --font-weight companions
    if (!t.size) { if (!Object.hasOwn(T.fontSize, k)) continue; } else tokens++;
    const v = (part, prop, wrap) => (t[part] ? (t[part].inline ? t[part].value : wrap(`var(--text-${k}${part === 'size' ? '' : `--${part}`})`)) : null);
    const d = { ...(T.fontSize[k] ?? {}) };
    if (t.size) d['font-size'] = v('size', 'font-size', (x) => x);
    if (t['line-height']) d['line-height'] = v('line-height', 'line-height', (x) => `var(--tw-leading, ${x})`); else if (t.size && !Object.hasOwn(T.fontSize, k)) delete d['line-height'];
    if (t['letter-spacing']) d['letter-spacing'] = v('letter-spacing', 'letter-spacing', (x) => `var(--tw-tracking, ${x})`);
    if (t['font-weight']) d['font-weight'] = v('font-weight', 'font-weight', (x) => `var(--tw-font-weight, ${x})`);
    T.fontSize[k] = d;
  }
  for (const n of customs) { if (n.endsWith('-')) T.custom.prefixes.push(n); else T.custom.names.add(n); }
  for (const n of restyled) T.custom.names.add(n);
  if (restyled.size) unread.push(`project CSS rules on utility classes, which stay unknown: ${[...restyled].sort().join(' ')}`);
  return { key: `v4-theme:${shaAll}`, table: T, project: { path: entry, sha256: files[0].sha256, form: 'v4-theme', files, tokens, ...(unread.length ? { unread } : {}) } };
}

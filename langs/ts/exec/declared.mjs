// a unit no parent holds is checked against its declaration (design/w1h-new-units.md): the declared types of its
// parameters say which inputs it admits, its declared return type which values it may return, its JSDoc `@throws` and an
// `asserts`/`never` return which throws it declares. This module reads the declaration and judges values against it.
//
// member(spec, value) is three-valued: 'yes' (the value is one of the declared type), 'no' (it is not), 'unknown' (the
// spec does not say: a type lean reads as opaque, a type parameter, a tuple whose optional elements the spec drops, an
// accessor that would run code to read). The two claims built on it read it in opposite directions, each on the side
// that cannot be wrong: a fault needs every argument 'yes' (an input the declaration admits), a shape needs the returned
// value 'no' (a value outside the declared type). An 'unknown' makes neither claim.
import { ts, topLevelFunctions } from '../common.mjs';

const tag = (v) => Object.prototype.toString.call(v);
const isFake = (v) => { try { return !!v && (typeof v === 'object' || typeof v === 'function') && v.__isFake === true; } catch { return false; } };
const isObjectLike = (v) => v !== null && (typeof v === 'object' || typeof v === 'function');
// every answer of a list: 'no' if one is 'no', 'yes' if all are 'yes', else 'unknown'
const all = (answers) => { let out = 'yes'; for (const a of answers) { if (a === 'no') return 'no'; if (a !== 'yes') out = 'unknown'; } return out; };
const any = (answers) => { let out = 'no'; for (const a of answers) { if (a === 'yes') return 'yes'; if (a !== 'no') out = 'unknown'; } return out; };
// a property read that runs no code: an own data property, absent, or 'unknown' (an accessor, a member the prototype holds)
function own(v, k) {
  let d; try { d = Object.getOwnPropertyDescriptor(v, k); } catch { return { unknown: true }; }
  if (d) return Object.hasOwn(d, 'value') ? { present: true, value: d.value } : { unknown: true };
  try { return k in v ? { unknown: true } : { absent: true }; } catch { return { unknown: true }; }
}

// opts.nullable: the project reads without strictNullChecks, so null and undefined are values of every type;
// opts.side 'input' | 'output': a lean fake drawn for a handle type (a function, a service, a class) is built to the
// declaration as an input; as an output it is the world's value and says nothing of the unit
export function member(spec, v, defs = {}, opts = {}, depth = 0) {
  if (!spec || depth > 12) return 'unknown';
  if (opts.nullable && (v === null || v === undefined)) return 'yes';
  if (spec.kind === 'ref') return defs[spec.key] ? member(defs[spec.key], v, defs, opts, depth + 1) : 'unknown';
  if (isFake(v)) return opts.side === 'input' && ['function', 'service', 'class'].includes(spec.kind) ? 'yes' : 'unknown';
  const m = (s, x) => member(s, x, defs, opts, depth + 1);
  switch (spec.kind) {
    case 'opaque': return spec.all ? 'yes' : 'unknown';
    case 'tparam': return 'unknown';
    case 'string': return typeof v === 'string' ? 'yes' : 'no';
    case 'number': return typeof v === 'number' ? 'yes' : 'no';
    case 'boolean': return typeof v === 'boolean' ? 'yes' : 'no';
    case 'bigint': return typeof v === 'bigint' ? 'yes' : 'no';
    case 'symbol': return typeof v !== 'symbol' ? 'no' : spec.unique ? 'unknown' : 'yes';
    case 'null': return v === null ? 'yes' : 'no';
    case 'undefined': return v === undefined ? 'yes' : 'no';
    case 'literal': return spec.values.some((x) => x === v) ? 'yes' : 'no';
    case 'union': return any(spec.options.map((o) => m(o, v)));
    case 'array': return Array.isArray(v) ? all(Array.from(v, (x) => m(spec.of, x))) : 'no';
    case 'tuple': if (!Array.isArray(v)) return 'no'; return v.length === spec.items.length ? all(spec.items.map((s, i) => m(s, v[i]))) : 'unknown';
    case 'set': if (tag(v) !== '[object Set]') return 'no'; { const xs = []; try { Set.prototype.forEach.call(v, (x) => xs.push(m(spec.of, x))); } catch { return 'unknown'; } return all(xs); }
    case 'map': if (tag(v) !== '[object Map]') return 'no'; { const xs = []; try { Map.prototype.forEach.call(v, (x, k) => xs.push(m(spec.key, k), m(spec.value, x))); } catch { return 'unknown'; } return all(xs); }
    case 'date': return tag(v) === '[object Date]' ? 'yes' : 'no';
    case 'error': return tag(v) === '[object Error]' ? 'yes' : 'no';
    case 'promise': return tag(v) === '[object Promise]' ? 'yes' : isObjectLike(v) && typeof v.then === 'function' ? 'unknown' : 'no';
    case 'function': case 'class': return typeof v === 'function' ? 'yes' : 'no';
    case 'async-iterable': return isObjectLike(v) ? 'unknown' : 'no';
    case 'service': return isObjectLike(v) ? 'unknown' : 'no'; // its methods' presence is the type's, which members the spec names only when the file names them
    case 'dict': { if (!isObjectLike(v) || Array.isArray(v)) return isObjectLike(v) ? 'unknown' : 'no'; let keys; try { keys = Object.keys(v); } catch { return 'unknown'; } return all(keys.map((k) => { const p = own(v, k); return p.present ? m(spec.value, p.value) : 'unknown'; })); }
    case 'record': {
      if (!isObjectLike(v)) return 'no'; // a value of an object type is an object (structural typing admits more keys, never a primitive)
      return all(Object.entries(spec.fields).filter(([, f]) => !f.extra).map(([k, f]) => {
        const p = own(v, k);
        if (p.unknown) return 'unknown';
        if (p.absent || p.value === undefined) return f.optional ? 'yes' : p.absent ? 'no' : m(f.spec, undefined);
        return m(f.spec, p.value);
      }));
    }
    default: return 'unknown';
  }
}

// the edge values a declared type admits (design/w1h-new-units.md, "the draw"): the absent value, the empty one, zero
// and the special numbers, and malformed text, each kept only when member() says 'yes' for it. Lane B's generator draws
// boundary values of the unit's own literals first; these are the values of the type itself that a caller can pass
// and a test seldom does
const MALFORMED = [
  '',                 // empty
  ' ',                // whitespace only
  '\uD800',           // a lone surrogate: not well-formed UTF-16 (encodeURIComponent, TextEncoder round trips)
  '\u0000',           // NUL
  '%E0%A4%A',         // a truncated percent-encoding (decodeURIComponent)
  '{"a":',            // truncated JSON (JSON.parse)
  'NaN', '-0', '1e999', // number-looking text that is not a finite number
  'x'.repeat(10000),  // very long
];
const NUMBERS = [0, -0, NaN, Infinity, -Infinity, -1, 0.5, 2 ** 53, Number.MIN_VALUE];
export function edgeValues(spec, defs = {}, depth = 0) {
  if (!spec || depth > 4) return [];
  const out = (() => {
    switch (spec.kind) {
      case 'ref': return defs[spec.key] ? edgeValues(defs[spec.key], defs, depth + 1) : [];
      case 'null': return [null];
      case 'undefined': return [undefined];
      case 'string': return MALFORMED;
      case 'number': return NUMBERS;
      case 'boolean': return [false, true];
      case 'bigint': return [0n, -1n];
      case 'literal': return spec.values.slice(0, 6);
      case 'opaque': return spec.all ? [undefined, null, 0, '', NaN, {}, []] : [];
      case 'date': return [new Date(NaN), new Date(0)];
      case 'union': { // the absent options first: they are the ones a body forgets
        const absent = spec.options.filter((o) => o && (o.kind === 'null' || o.kind === 'undefined'));
        return [...absent, ...spec.options.filter((o) => !absent.includes(o))].flatMap((o) => edgeValues(o, defs, depth + 1));
      }
      case 'array': return [[], ...edgeValues(spec.of, defs, depth + 1).slice(0, 4).map((x) => [x])];
      case 'tuple': { const items = spec.items.map((s) => edgeValues(s, defs, depth + 1)); return items.every((xs) => xs.length) ? [items.map((xs) => xs[0])] : []; }
      case 'dict': return [{}, ...edgeValues(spec.value, defs, depth + 1).slice(0, 2).map((x) => ({ k0: x }))];
      case 'set': return [new Set()];
      case 'map': return [new Map()];
      case 'record': {
        const fields = Object.entries(spec.fields).filter(([, f]) => !f.extra);
        const firsts = fields.map(([k, f]) => [k, f, edgeValues(f.spec, defs, depth + 1)]);
        if (firsts.some(([, f, xs]) => !f.optional && !xs.length)) return []; // a required field this module draws no value of
        const base = Object.fromEntries(firsts.filter(([, f]) => !f.optional).map(([k, , xs]) => [k, xs[0]]));
        const variants = [base];
        for (const [k, , xs] of firsts.slice(0, 6)) for (const x of xs.slice(0, 4)) variants.push({ ...base, [k]: x });
        return variants.slice(0, 24);
      }
      default: return []; // a handle (a function, a service, a class), a promise, a type parameter: the generator's draw stands
    }
  })();
  return depth === 0 ? out.filter((x) => member(spec, x, defs, { side: 'input' }) === 'yes') : out;
}

// the edge inputs of a unit: one parameter at a time takes each of its edge values (an optional parameter its absence
// first), the others keep the generator's draw; the parameters take turns, so every parameter meets its first edges
// within the first inputs. LEAN_BREAK=declared-edges switches them off (tests/w1h-new-units.mjs)
export function edgePlan(declared) {
  if (process.env.LEAN_BREAK === 'declared-edges') return [];
  const lists = declared.params.map((p) => p.rest ? [] : [...(p.optional && !edgeValues(p.spec, declared.defs).includes(undefined) ? [undefined] : []), ...edgeValues(p.spec, declared.defs)]);
  const plan = [];
  for (let j = 0; lists.some((xs) => j < xs.length); j++) lists.forEach((xs, k) => { if (j < xs.length) plan.push({ param: k, value: xs[j] }); });
  return plan;
}
export const edgeInput = (args, step) => { const out = args.slice(); while (out.length <= step.param) out.push(undefined); out[step.param] = step.value; return out; };

// whether an argument list is one the declaration admits: every parameter's value is 'yes' (an optional parameter
// admits undefined; a rest parameter its list)
export function admitted(declared, args, opts = {}) {
  return all(declared.params.map((p, k) => (p.optional && args[k] === undefined ? 'yes' : member(p.spec, args[k], declared.defs, { ...opts, side: 'input' }))));
}

// the declaration's own text: the return type as written (null when the checker infers it from the body: an inferred
// type is the body's, never a declaration of it), `void` (a result the caller ignores: no shape is claimed), the throws
// it declares (JSDoc `@throws {T}`, any throw for a `@throws` without a type, an `asserts` predicate or a `never` return)
export function declaration(sf, unitName, checker) {
  const u = topLevelFunctions(sf).get(unitName);
  const fn = u?.fn;
  if (!fn) return null;
  const holder = ts.isVariableDeclaration(fn.parent) ? fn.parent : ts.isPropertyAssignment(fn.parent) ? fn.parent : null;
  const typeNode = fn.type ?? ts.getJSDocReturnType(fn) ?? null;
  const contextual = !typeNode && holder?.type ? holder.type : null; // `const f: (x: T) => R = ...`: the variable's type declares it
  let returns = typeNode ? typeNode.getText(sf) : null;
  if (!returns && contextual && checker) { try { const sig = checker.getSignaturesOfType(checker.getTypeFromTypeNode(contextual), ts.SignatureKind.Call)[0]; if (sig) returns = checker.typeToString(sig.getReturnType()); } catch { /* none */ } }
  const asserts = !!typeNode && ts.isTypePredicateNode(typeNode) && !!typeNode.assertsModifier;
  const tags = ts.getJSDocTags(fn);
  const throwTags = tags.filter((t) => ['throws', 'throw', 'exception'].includes(t.tagName.text));
  const throwTypes = throwTags.map((t) => t.typeExpression?.type?.getText(sf) ?? (typeof t.comment === 'string' ? t.comment.match(/^\s*\{([^}]+)\}/)?.[1] : null) ?? null);
  const params = tags.filter((t) => ts.isJSDocParameterTag(t)).map((t) => t.name.getText(sf));
  const voidLike = !!returns && /^(?:void|Promise<void>|PromiseLike<void>)$/.test(returns.replace(/\s+/g, ''));
  return {
    returns, voidLike, inferred: !returns,
    throws: asserts || returns === 'never' ? 'any' : throwTypes.some((x) => !x) ? 'any' : throwTypes.flatMap((x) => x.split('|').map((y) => y.trim())),
    ...(asserts ? { asserts: true } : {}),
    jsdoc: { params, returns: tags.some((t) => ['returns', 'return'].includes(t.tagName.text)), throws: throwTags.length },
  };
}

// whether a thrown value is one the declaration names: a `@throws {T}` names T and every class extending it, read off
// the value's prototype chain by constructor name (the realm of the unit is not lean's, so instanceof cannot tell)
export function declaredThrow(decl, thrown) {
  if (!decl || process.env.LEAN_BREAK === 'declared-throws') return false;
  if (decl.throws === 'any') return true;
  if (!decl.throws.length) return false;
  const names = new Set();
  try { for (let p = thrown; p && names.size < 20; p = Object.getPrototypeOf(p)) { const c = Object.getOwnPropertyDescriptor(p, 'constructor')?.value; if (typeof c === 'function' && c.name) names.add(c.name); } } catch { /* a value that refuses its prototype names none */ }
  try { if (thrown && typeof thrown.name === 'string') names.add(thrown.name); } catch { /* none */ }
  return decl.throws.some((t) => names.has(t.replace(/^.*\./, '')));
}

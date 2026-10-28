// A same-file reference is keyed by the code it reaches, not by its name or text (design/reach-keys.md).

// a module constant holding a function value: passed by name as a callback, and called directly
function makeScale(k: number): (x: number) => number { return (x: number) => x * k; }
const scale = makeScale(2);
export function scaled(xs: number[]): number[] { return xs.map(scale); }
export function applied(x: number): number { return scale(x); }
// the same forms on a constant whose reach does not change
function makeShift(k: number): (x: number) => number { return (x: number) => x + k; }
const shift = makeShift(1);
export function shifted(xs: number[]): number[] { return xs.map(shift); }
export function moved(x: number): number { return shift(x); }

// a module constant whose initializer calls a same-file function
function make(k: number): { x: number } { return { x: k + 1 }; }
const CFG = make(1);
export function cfgX(y: number): number { return CFG.x + y; }
function build(k: number): { y: number } { return { y: k * 2 }; }
const OPTS = build(1);
export function optsY(z: number): number { return OPTS.y + z; }

// a tagged template whose tag is a same-file function
function tag(s: TemplateStringsArray, ...v: number[]): string { return s.join("|"); }
export function tagged(x: number): string { return tag`a${x}b`; }
function mark(s: TemplateStringsArray, ...v: number[]): string { return s.join(":"); }
export function marked(x: number): string { return mark`a${x}b`; }

// instanceof against a same-file class
class Base { b = 0; }
class Other { b = 0; }
class Child extends Base { c = 1; }
export function isBase(n: number): boolean { const b: object = n > 0 ? new Child() : {}; return b instanceof Base; }
class Shape { s = 0; }
class Square extends Shape { q = 2; }
export function isShape(v: Square | Date): boolean { return v instanceof Shape; }

// a unit read as one opaque numeric function (a divisor that is not a literal) that reads a module cell: keyed by the
// code it reaches, so an edit elsewhere in the file leaves it proved
let count = 4;
export function ratio(x: number): number { return x / count; }

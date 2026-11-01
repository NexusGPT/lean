// The --break switch the code under test reads (W1 amendment A6; the convention, its registry and its suite rows are
// tests/break.mjs). It lives beside the product, not under tests/: a copy of the product without its tests (the
// importers check, the resource-limit check) still loads, and the lowering's producer hash covers it.
export const BREAK_ENV = 'LEAN_BREAK';
// `LEAN_BREAK` is a comma-separated list of mechanism names; a mechanism whose name is listed is skipped
export const broken = (name) => String(process.env[BREAK_ENV] ?? '').split(',').map((x) => x.trim()).includes(name);

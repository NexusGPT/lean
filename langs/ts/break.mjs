// The --break switch the code under test reads (W1 amendment A6; the convention, its registry and its suite rows are
// tests/break.mjs). It lives beside the product, not under tests/: a copy of the product without its tests (the
// importers check, the resource-limit check) still loads, and the lowering's producer hash covers it.
export const BREAK_ENV = 'LEAN_BREAK';
// `LEAN_BREAK` is a comma-separated list of mechanism names; a mechanism whose name is listed is skipped. Every name is
// registered in tests/break.mjs MECHANISMS; the code reads the switch only here (broken, breakList), read at each use
export const breakList = () => String(process.env[BREAK_ENV] ?? '').split(',').map((x) => x.trim()).filter(Boolean);
export const broken = (name) => breakList().includes(name);

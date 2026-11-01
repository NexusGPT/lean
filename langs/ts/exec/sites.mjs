// The site of a lane B witness (design/w8n-all-sites.md): two witnesses are one site when their difference has the
// same field, the same two operations, and the same candidate line. Lane B keeps one witness per site (exec/run.mjs
// keepDifference); pr.mjs keeps one per site when it builds a row's `witnesses` (siteWitnesses).

export const WITNESS_SITES = 8; // the distinct sites lane B holds before it stops drawing (design/constants.md)
export const WITNESS_SHARE = 0.25; // past its first witness, lane B draws for at most this share of the unit's seconds

export function siteKey(where) {
  const w = where ?? {}, site = w.lines?.candidate;
  return JSON.stringify([w.field ?? null, w.parent?.op ?? null, w.candidate?.op ?? null, site?.start ?? site?.line ?? null]);
}

// a difference lane B found: kept when its site is new; true when the run holds enough and should stop drawing.
// LEAN_BREAK=w8n-all-sites restores the earlier rule (every differing input kept, stop at the third)
export function keepDifference(diffs, w) {
  if (process.env.LEAN_BREAK === 'w8n-all-sites') { diffs.push(w); return diffs.length >= 3; }
  const sites = (diffs.sites ??= new Set()), key = siteKey(w.where);
  diffs.differing = (diffs.differing ?? 0) + 1;
  if (!sites.has(key)) { sites.add(key); diffs.push(w); }
  return diffs.length >= WITNESS_SITES;
}

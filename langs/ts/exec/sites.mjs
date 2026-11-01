// The site of a lane B witness (design/w8n-all-sites.md): two witnesses are one site when their difference has the
// same field, the same two operations, and the same candidate line. Lane B keeps one witness per site (exec/run.mjs
// keepDifference); pr.mjs keeps one per site when it builds a row's `witnesses` (siteWitnesses).

export const WITNESS_SITES = 8; // the distinct sites lane B holds before it stops drawing (design/constants.md)
export const WITNESS_SHARE = 0.25; // past its first witness, lane B draws for at most this share of the unit's seconds

// `where.reach` (design/w9i-reach.md): the changed statements a witness completed that no witness kept before it had;
// a witness kept for them alone is its own site, so its key names them
export function siteKey(where) {
  const w = where ?? {}, site = w.lines?.candidate;
  return JSON.stringify([w.field ?? null, w.parent?.op ?? null, w.candidate?.op ?? null, site?.start ?? site?.line ?? null, ...(w.reach ? [w.reach] : [])]);
}

// a difference lane B found: kept when its site is new; true when the run holds enough and should stop drawing.
// `sameInput`: a further field of an input already counted (run.mjs fieldDifferences). LEAN_BREAK=w8n-all-sites
// restores the earlier rule (every differing input kept, stop at the third). `w.reached`: the unit's changed statements
// the input completed (run.mjs reachedOf); a difference at a site already held is kept as its own site when the input
// completed a changed statement no kept witness completed (LEAN_BREAK=w9i-reach: never)
export function keepDifference(diffs, w, sameInput = false) {
  if (process.env.LEAN_BREAK === 'w8n-all-sites') { diffs.push(w); return diffs.length >= 3; }
  const sites = (diffs.sites ??= new Set()), held = (diffs.reached ??= new Set());
  let key = siteKey(w.where);
  if (!sameInput) diffs.differing = (diffs.differing ?? 0) + 1;
  if (sites.has(key) && !sameInput && process.env.LEAN_BREAK !== 'w9i-reach') {
    const fresh = (w.reached ?? []).filter((x) => !held.has(x));
    if (fresh.length) { w = { ...w, where: { ...w.where, reach: fresh } }; key = siteKey(w.where); }
  }
  if (!sites.has(key)) { sites.add(key); diffs.push(w); for (const x of w.reached ?? []) held.add(x); }
  return diffs.length >= WITNESS_SITES;
}

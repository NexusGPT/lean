// a number that may be absent: a record field or a dictionary entry the type allows to be missing, read behind a guard
// or `??`, and a result built from it
export type MechanicKind = "buy_n_get_m_free" | "nth_at_pct_off" | "n_for_price" | "pct_off";

export interface Offer {
  mechanic_raw: string | null;
  mechanic_kind: MechanicKind | null;
  mechanic_params: Record<string, number> | null;
  unlock_quantity: number;
}

export type Mechanic =
  | { kind: "per_unit"; reason: string }
  | { kind: "buy_n_get_m_free"; group: number; free: number }
  | { kind: "nth_at_pct_off"; nth: number; pct: number }
  | { kind: "n_for_price"; n: number; priceCents: number }
  | { kind: "not_modelled"; because: string };

type Params = Offer["mechanic_params"];

// untouched: the first spelling present among the keys, else null
export const pick = (p: Params, ...keys: string[]): number | null => {
  if (!p) return null;
  for (const k of keys) {
    const v = p[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
};

// refactor of the parent: shorthand fields spelled out, one guard turned around
export function readMechanic(offer: Offer): Mechanic {
  const kind: MechanicKind | null = offer.mechanic_kind;
  const p: Params = offer.mechanic_params;
  const unlock = Number(offer.unlock_quantity ?? 1);
  const raw = offer.mechanic_raw ?? "this promotion";
  if (kind === null) return { kind: "per_unit", reason: "no promotion on this row" };
  switch (kind) {
    case "buy_n_get_m_free": {
      const free = pick(p, "m", "free", "freeCount");
      const buy = pick(p, "n", "buy", "count");
      let group: number;
      if (unlock > 1) {
        group = unlock;
      } else if (free !== null && buy !== null) {
        group = buy + free;
      } else {
        group = 0;
      }
      if (free === null || group < 2 || free >= group) {
        return { kind: "not_modelled", because: `"${raw}" does not say how many units come free` };
      }
      return { kind: "buy_n_get_m_free", group: group, free: free };
    }
    case "nth_at_pct_off": {
      const named = pick(p, "nth");
      const nth = named !== null ? named : unlock > 1 ? unlock : null;
      const pct = pick(p, "pct", "percent");
      if (nth !== null && nth >= 2 && pct !== null && pct > 0 && pct <= 100) {
        return { kind: "nth_at_pct_off", nth: nth, pct: pct };
      }
      return { kind: "not_modelled", because: `"${raw}" does not say how much comes off which unit` };
    }
    case "n_for_price": {
      const n = pick(p, "quantity", "count") ?? (unlock > 1 ? unlock : null);
      const price = pick(p, "price");
      if (n === null || n < 2 || price === null || price <= 0) {
        return { kind: "not_modelled", because: `"${raw}" does not say how many for how much` };
      }
      return { kind: "n_for_price", n: n, priceCents: Math.round(price * 100) };
    }
    case "pct_off":
      return { kind: "per_unit", reason: `"${raw}" is already inside the unit price` };
  }
}

// changed: an absent nth falls back to the unlock quantity even when it is 1
export function nthOf(offer: Offer): number | null {
  return pick(offer.mechanic_params, "nth") ?? offer.unlock_quantity;
}

// refactor of the parent: the missing key tested by `??`
export function entryOr(p: Record<string, number>, k: string): number {
  return p[k] ?? 0;
}

// changed: the type says the entry is a number, so the candidate drops the test a missing key fails
export function entryKind(p: Record<string, number>, k: string): number {
  return p[k];
}

// stays out: the same behaviour written as an early return, still through `let`: two opaque functions, never equal
export function entryLet(p: Record<string, number>, k: string): number {
  let v = p[k];
  if (typeof v !== "number") return 0;
  return v;
}

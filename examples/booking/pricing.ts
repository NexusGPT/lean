// A pricing core written in lean style: pure functions over plain data. Every function here is provable.
// The shapes mirror a real price-comparison app: shops in zones, articles with per-shop prices, promotions with
// windows and conditions, carts, and the totals a page shows.

export type ZoneId = "north" | "centre" | "south";
export type Shop = { readonly id: string; readonly zone: ZoneId; readonly deliveryFeeCents: number; readonly freeDeliveryFromCents: number };
export type Article = { readonly sku: string; readonly name: string; readonly category: string };
export type Price = { readonly shopId: string; readonly sku: string; readonly cents: number; readonly validUntilDay: number };
export type Promo =
  | { readonly kind: "percent"; readonly shopId: string; readonly category: string; readonly percent: number; readonly fromDay: number; readonly toDay: number }
  | { readonly kind: "fixed"; readonly shopId: string; readonly sku: string; readonly offCents: number; readonly fromDay: number; readonly toDay: number };
export type CartLine = { readonly sku: string; readonly qty: number };
export type LineTotal = { readonly sku: string; readonly qty: number; readonly unitCents: number; readonly discountCents: number; readonly totalCents: number };
export type ShopQuote = { readonly shopId: string; readonly lines: readonly LineTotal[]; readonly goodsCents: number; readonly deliveryCents: number; readonly totalCents: number; readonly missing: readonly string[] };

export function isPromoActive(p: Promo, day: number): boolean {
  return p.fromDay <= day && day <= p.toDay;
}

export function priceOf(prices: readonly Price[], shopId: string, sku: string, day: number): number | null {
  let best: number | null = null;
  for (const p of prices) {
    if (p.shopId !== shopId || p.sku !== sku || p.validUntilDay < day) continue;
    if (best === null || p.cents < best) best = p.cents;
  }
  return best;
}

export function categoryOf(articles: readonly Article[], sku: string): string | null {
  const a = articles.find((x) => x.sku === sku);
  return a === undefined ? null : a.category;
}

// the discount a promotion gives on one unit; promotions do not stack: the largest single discount wins
export function unitDiscount(promos: readonly Promo[], shopId: string, sku: string, category: string, unitCents: number, day: number): number {
  let best = 0;
  for (const p of promos) {
    if (p.shopId !== shopId || !isPromoActive(p, day)) continue;
    let d = 0;
    if (p.kind === "percent" && p.category === category) d = Math.floor((unitCents * p.percent) / 100);
    if (p.kind === "fixed" && p.sku === sku) d = p.offCents;
    if (d > unitCents) d = unitCents;
    if (d > best) best = d;
  }
  return best;
}

export function lineTotal(articles: readonly Article[], prices: readonly Price[], promos: readonly Promo[], shopId: string, line: CartLine, day: number): LineTotal | null {
  const unit = priceOf(prices, shopId, line.sku, day);
  if (unit === null) return null;
  const category = categoryOf(articles, line.sku);
  const discount = category === null ? 0 : unitDiscount(promos, shopId, line.sku, category, unit, day);
  const qty = line.qty < 0 ? 0 : line.qty;
  return { sku: line.sku, qty, unitCents: unit, discountCents: discount * qty, totalCents: (unit - discount) * qty };
}

export function deliveryFee(shop: Shop, goodsCents: number): number {
  if (goodsCents >= shop.freeDeliveryFromCents) return 0;
  return shop.deliveryFeeCents;
}

export function quoteShop(shop: Shop, articles: readonly Article[], prices: readonly Price[], promos: readonly Promo[], cart: readonly CartLine[], day: number): ShopQuote {
  let lines: LineTotal[] = [];
  let missing: string[] = [];
  let goods = 0;
  for (const line of cart) {
    const t = lineTotal(articles, prices, promos, shop.id, line, day);
    if (t === null) { missing = [...missing, line.sku]; continue; }
    lines = [...lines, t];
    goods = goods + t.totalCents;
  }
  const delivery = deliveryFee(shop, goods);
  return { shopId: shop.id, lines, goodsCents: goods, deliveryCents: delivery, totalCents: goods + delivery, missing };
}

export function quoteAll(shops: readonly Shop[], zone: ZoneId, articles: readonly Article[], prices: readonly Price[], promos: readonly Promo[], cart: readonly CartLine[], day: number): readonly ShopQuote[] {
  let out: ShopQuote[] = [];
  for (const s of shops) {
    if (s.zone !== zone) continue;
    out = [...out, quoteShop(s, articles, prices, promos, cart, day)];
  }
  return out;
}

// the cheapest complete quote (no missing article); ties keep the first shop in registry order
export function cheapestComplete(quotes: readonly ShopQuote[]): ShopQuote | null {
  let best: ShopQuote | null = null;
  for (const q of quotes) {
    if (q.missing.length > 0) continue;
    if (best === null || q.totalCents < best.totalCents) best = q;
  }
  return best;
}

export function savingsAgainst(quotes: readonly ShopQuote[], chosen: ShopQuote): number {
  let worst = chosen.totalCents;
  for (const q of quotes) if (q.missing.length === 0 && q.totalCents > worst) worst = q.totalCents;
  return worst - chosen.totalCents;
}

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = cents < 0 ? -cents : cents;
  const euros = Math.floor(abs / 100);
  const rest = abs - euros * 100;
  const restText = rest < 10 ? "0" + rest : "" + rest;
  return sign + euros + "," + restText + " €";
}

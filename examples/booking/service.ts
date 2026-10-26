// A service layer written in lean style: a class with injected ports, async calls into the outside world, and
// results as values. Every method is provable: a call to a port is a transition of the world, errors are returned,
// and no method assigns a field of `this`.
import type { Article, CartLine, Price, Promo, Shop, ShopQuote, ZoneId } from "./pricing";
import { cheapestComplete, quoteAll, savingsAgainst, formatCents } from "./pricing";

export interface CatalogPort {
  shops(): Promise<readonly Shop[]>;
  articles(): Promise<readonly Article[]>;
  prices(zone: ZoneId): Promise<readonly Price[]>;
  promos(zone: ZoneId): Promise<readonly Promo[]>;
}
export interface ClockPort { today(): number; }
export interface AuditPort { record(event: string, detail: string): Promise<void>; }

export type QuoteError = { readonly code: "empty-cart" | "unknown-zone" | "nothing-complete"; readonly detail: string };
export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: QuoteError };
export type BestQuote = { readonly chosen: ShopQuote; readonly alternatives: readonly ShopQuote[]; readonly savingsText: string; readonly day: number };

const ZONES: readonly string[] = ["north", "centre", "south"];

export function isZone(z: string): boolean {
  return ZONES.includes(z);
}

export function cleanCart(cart: readonly CartLine[]): readonly CartLine[] {
  let out: CartLine[] = [];
  for (const line of cart) {
    if (line.qty <= 0 || line.sku === "") continue;
    const i = out.findIndex((x) => x.sku === line.sku);
    if (i < 0) { out = [...out, line]; continue; }
    const merged: CartLine = { sku: line.sku, qty: out[i].qty + line.qty };
    out = [...out.slice(0, i), merged, ...out.slice(i + 1)];
  }
  return out;
}

export class QuoteService {
  constructor(private readonly catalog: CatalogPort, private readonly clock: ClockPort, private readonly audit: AuditPort) {}

  async best(zoneText: string, rawCart: readonly CartLine[]): Promise<Result<BestQuote>> {
    const cart = cleanCart(rawCart);
    if (cart.length === 0) return { ok: false, error: { code: "empty-cart", detail: "no article with a positive quantity" } };
    if (!isZone(zoneText)) return { ok: false, error: { code: "unknown-zone", detail: zoneText } };
    const zone = zoneText as ZoneId;
    const day = this.clock.today();
    const shops = await this.catalog.shops();
    const articles = await this.catalog.articles();
    const prices = await this.catalog.prices(zone);
    const promos = await this.catalog.promos(zone);
    const quotes = quoteAll(shops, zone, articles, prices, promos, cart, day);
    const chosen = cheapestComplete(quotes);
    if (chosen === null) {
      await this.audit.record("quote.nothing-complete", zoneText);
      return { ok: false, error: { code: "nothing-complete", detail: "no shop in " + zoneText + " carries the whole cart" } };
    }
    await this.audit.record("quote.best", chosen.shopId + ":" + chosen.totalCents);
    const savings = savingsAgainst(quotes, chosen);
    return { ok: true, value: { chosen, alternatives: quotes, savingsText: formatCents(savings), day } };
  }

  async missingFor(zoneText: string, rawCart: readonly CartLine[]): Promise<readonly string[]> {
    if (!isZone(zoneText)) return [];
    const zone = zoneText as ZoneId;
    const cart = cleanCart(rawCart);
    const shops = await this.catalog.shops();
    const articles = await this.catalog.articles();
    const prices = await this.catalog.prices(zone);
    const promos = await this.catalog.promos(zone);
    const quotes = quoteAll(shops, zone, articles, prices, promos, cart, this.clock.today());
    let seen: string[] = [];
    for (const q of quotes) for (const sku of q.missing) if (!seen.includes(sku)) seen = [...seen, sku];
    return seen;
  }
}

// the outside the type_assertions pair calls: a factory whose product's methods are declared in this file, not the unit's
export interface Analytics { exportCsv(o: { v: number }): string }
export interface Client { analytics: Analytics }
export function makeClient(): Client {
  return { analytics: { exportCsv: (o) => `${o.v}` } };
}

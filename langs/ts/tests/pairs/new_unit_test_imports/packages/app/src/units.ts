// units whose reach crosses an import the checker follows only as the repository resolves it (design/w9au-import-follow.md)
import type { Clock } from '@fx/lib';
import type { Meter } from '@fx/meter';
import type { Ids } from './ids';
import type { Host } from './host';
import type { Banner } from './banner';
import { double } from './twice.js';

// the reach follows Clock.now into a workspace package, whose own tsconfig maps `@lib/tick`
export function later(c: Clock, by: number): number {
  return c.now() + by;
}
// the reach follows Meter.read into the workspace package's source, named by its manifest's build entry
export function gauge(m: Meter): string {
  return `${m.read()} units`;
}
// the reach meets `v7` of a declared, uninstalled package: a package lean fakes
export function label(ids: Ids): string {
  return `id-${ids.next()}`;
}
// the reach meets `isIP` of node:net: a builtin lean's node fakes answer
export function hostKind(h: Host, name: string): string {
  return h.kind(name) === 0 ? 'name' : 'address';
}
// the reach meets an import that resolves nowhere: the refusal names why
export function bannerText(b: Banner): string {
  return b.text().toUpperCase();
}
// a `.js` specifier naming a `.ts` file
export function quad(x: number): number {
  return double(double(x));
}

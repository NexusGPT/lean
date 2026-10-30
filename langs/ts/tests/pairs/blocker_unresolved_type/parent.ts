// A parameter whose type the checkout cannot resolve (an unresolved type-only import, a DOM or React event type) is
// opaque; the doubles lane reads a unit that never reads it (translate/smt-fp.mjs, design/opaque-params-fp.md)
import type { Foo } from 'some-external-pkg';

export function keyScore(e: React.KeyboardEvent<HTMLInputElement>, n: number): number {
  return n * 2;
}

export function shifted(e: KeyboardEvent, n: number): number {
  return n + 1;
}

export function enterOnly(e: React.KeyboardEvent<HTMLInputElement>, n: number): number {
  return e.key === 'Enter' ? n * 2 : 0;
}

export function negated(x: Foo, n: number): number {
  return -(-n);
}

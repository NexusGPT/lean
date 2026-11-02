import { announce } from './fork';
import { encode } from './flow';
import { limit } from './limits';

export function over(n: number): number {
  return n >= 0 ? limit : 0;
}

export function report(n: number): number {
  announce(n + 1);
  return n;
}

export function twice(n: number): number {
  return n * 2;
}

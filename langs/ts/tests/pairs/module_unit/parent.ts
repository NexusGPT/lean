import { register, announce } from 'plugin-host';

const RETRIES = 3;
let attempts = 0;

export function next(n: number): number {
  return n + 1;
}

register('alpha', { retries: RETRIES });
attempts = RETRIES * 2;
announce(`ready after ${attempts}`);
export const banner = 'alpha';

import { register, announce } from 'plugin-host';

const RETRIES = 3;
let attempts = 0;

export function next(n: number): number {
  return n + 1;
}

const options = { retries: RETRIES };
register('alpha', options);
const doubled = RETRIES + RETRIES;
attempts = doubled;
announce('ready after ' + attempts);
export const banner = 'alpha';

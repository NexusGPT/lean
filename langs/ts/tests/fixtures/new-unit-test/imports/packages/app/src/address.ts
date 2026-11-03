// node:net called by the unit itself: the test mocks it with lean's answers
import { isIP } from 'node:net';

export function isAddress(s: string): boolean {
  return isIP(s) !== 0;
}

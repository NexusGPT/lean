// an alias of this package's own tsconfig (`@lib/*`), which the importing package's tsconfig does not hold
import { tick } from '@lib/tick';

export class Clock {
  now(): number { return tick(); }
}

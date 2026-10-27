// stage 5 step 20: a decorated class is read like any other; its decorators are metadata, a call of a method a
// decorator may replace is a transition
import { Injectable, Log } from "./meta";

@Injectable()
export class Counter {
  count = 0;
  step = 1;

  bump(): number {
    this.count += this.step;
    return this.count + 0;
  }

  @Log()
  reset(): void {
    this.count = 1;
  }

  twice(): number {
    this.bump();
    return this.bump();
  }

  clear(): number {
    this.reset();
    const c = this.count;
    return c;
  }
}

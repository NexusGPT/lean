// stage 5 step 20, decorators read as metadata: a decorated class, a decorated method and a decorated property; a
// decorator that installs an accessor on a field, or returns another descriptor for a method or an accessor
import { Column, Count, Entity, Track } from "./meta";

@Entity()
export class Ledger {
  total = 0;
  fee = 2;

  add(n: number): number {
    this.total = this.total + n;
    return this.total;
  }

  charge(n: number): number {
    this.add(n);
    return this.total;
  }

  net(n: number): number {
    return n - this.fee + 1;
  }
}

export class Meter {
  level = 0;

  @Track()
  raise(): number {
    this.level += 2;
    return this.level;
  }

  peak(): number {
    const l = this.level;
    return l;
  }

  pump(): number {
    this.raise();
    return this.level;
  }
}

export class Row {
  @Column()
  name = "";
  size = 0;

  grow(): number {
    this.size = this.size + 1;
    return this.size;
  }

  label(): string {
    const n = this.name;
    return n + n;
  }

  rename(s: string): string {
    this.name = s;
    return s;
  }
}

export class Note {
  @Column()
  text?: string;
  size = 0;

  shown(): string {
    const t = this.text ?? "";
    return t + t;
  }
}

export class Dial {
  base = 1;

  @Count()
  private tick(): number {
    return this.base;
  }

  @Count()
  read(): number {
    return this.base;
  }

  @Count()
  get cur(): number {
    return this.base;
  }

  @Count()
  static seed(): number {
    return 1;
  }

  ticks(): number {
    const t = this.tick();
    return t + t;
  }

  curs(): number {
    const c = this.cur;
    return c + c;
  }
}

export function made(): number {
  const d = new Dial();
  const r = d.read();
  return r + r;
}

export function seeds(): number {
  const s = Dial.seed();
  return s + s;
}

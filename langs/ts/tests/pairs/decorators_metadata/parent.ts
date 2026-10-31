/// <reference path="./types.d.ts" />
// stage 5 step 20, decorators read as metadata: a decorated class, a decorated method and a decorated property; a
// decorator that installs an accessor on a field, or returns another descriptor for a method or an accessor
import { Injectable } from "@nestjs/common";
import { Column, Count, Entity, Track } from "./meta";

@Entity()
export class Ledger {
  total = 0;
  fee = 2;

  add(n: number): number {
    this.total += n;
    return this.total;
  }

  charge(n: number): number {
    this.add(n);
    return this.total;
  }

  net(n: number): number {
    return n - this.fee;
  }
}

export class Meter {
  level = 0;

  @Track()
  raise(): number {
    this.level += 1;
    return this.level;
  }

  peak(): number {
    return this.level;
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
    this.size += 1;
    return this.size;
  }

  label(): string {
    return this.name + this.name;
  }

  rename(s: string): string {
    this.name = s;
    return this.name;
  }
}

export class Note {
  @Column()
  text?: string;
  size = 0;

  shown(): string {
    return (this.text ?? "") + (this.text ?? "");
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
    return this.tick() + this.tick();
  }

  curs(): number {
    return this.cur + this.cur;
  }
}

export function made(): number {
  const d = new Dial();
  return d.read() + d.read();
}

export function seeds(): number {
  return Dial.seed() + Dial.seed();
}

@Injectable()
export class Registry {
  n = 2;

  private size(): number {
    return 2;
  }

  twice(): number {
    return this.size() + this.size();
  }
}

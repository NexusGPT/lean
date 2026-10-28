// expect: receiver-write
// a free function writing a receiver declared as a class instance: a class has no record value to rebuild (its
// fields live in the world of its methods); write the field in a method of the class, or take a record and return it
export class Meter { reading = 0; }
export function advance(this: Meter, by: number): number {
  this.reading = this.reading + by;
  return this.reading;
}

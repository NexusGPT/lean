// the base class, in its own file: the derived class reads its methods on `this`
export class Base {
  count = 0;
  format(x: number): string {
    return "#" + this.pad(x);
  }
  pad(x: number): string {
    return x < 10 ? "0" + x : "" + x;
  }
  label(s: string): string {
    return s.trim();
  }
  bump(): number {
    this.count = this.count + 1;
    return this.count;
  }
  describe(x: number): string {
    return this.word(x) + "?";
  }
  word(x: number): string {
    return "w" + x;
  }
}

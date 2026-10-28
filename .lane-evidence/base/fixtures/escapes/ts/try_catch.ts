// expect: delete
export class Reg {
  private cache: { a?: number } = {};
  forget(): number {
    delete this.cache.a;
    return 0;
  }
}

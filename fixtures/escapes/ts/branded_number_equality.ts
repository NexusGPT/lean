// expect: reference-equality
// a branded number (number & { brand }) is a number, but its carrier is opaque with an equality, and === is not
// reflexive on NaN: `a === a` is false for NaN. Branded strings, booleans and bigints compare by value (design/branded-primitive.md);
// compare the numbers themselves: `Number(a) === Number(b)`
declare const idBrand: unique symbol;
type Id = number & { readonly [idBrand]: true };
export function same(a: Id, b: Id): boolean {
  return a === b;
}

// a key typed string | symbol: no runtime discriminator between a string and a symbol, refused by the type reading
export function keyName(k: string | symbol): number {
  return 1;
}

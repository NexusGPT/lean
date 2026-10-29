/// <reference path="./dynamic.d.ts" />
// Metadata access is admitted, but Reflect keeps the reach open and uses the file key.
function dynamicG(x: number): number {
  const metadata = Reflect.getMetadata("key", {});
  return x;
}
export function dynamicCall(v?: number): number { return dynamicG(v!); }

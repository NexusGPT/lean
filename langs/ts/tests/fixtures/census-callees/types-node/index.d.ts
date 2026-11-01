declare module "fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function existsSync(path: string): boolean;
}
declare module "node:fs" { export * from "fs"; }

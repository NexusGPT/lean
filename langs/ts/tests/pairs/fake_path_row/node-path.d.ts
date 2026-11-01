// the part of @types/node's declaration of node:path this pair reads (a project of the census has @types/node installed)
declare module 'node:path' {
  interface PlatformPath { join(...paths: string[]): string; basename(path: string, suffix?: string): string; extname(path: string): string; dirname(path: string): string; normalize(path: string): string; isAbsolute(path: string): boolean; resolve(...paths: string[]): string }
  const path: PlatformPath;
  export = path;
}

// units that ask the world: each call's requests and lean's answers to them become the test's stubs (design/w9al-world-stubs.md)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// fetch answered by lean's table: the test stubs fetch with the recorded response and asserts the call
export async function fetchJson(url: string): Promise<unknown> {
  const r = await fetch(url);
  return r.json();
}
// the clock read once: fake timers at lean's instant
export function stamp(label: string): string {
  return `${label}@${Date.now()}`;
}
// a file read through node:fs: the module mocked with the recorded text
export function readConfig(dir: string): unknown {
  return JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));
}
// Math.random stubbed with lean's draw
export function pick(items: string[]): string | undefined {
  return items[Math.floor(Math.random() * items.length)];
}
// a write and nothing returned: the assertion is the write's path and content
export function saveNote(dir: string, text: string): void {
  writeFileSync(join(dir, 'note.txt'), text.trim());
}
// a clock no runner fakes by itself (performance.now): no test, and the reason names the surface
export function elapsed(since: number): number {
  return performance.now() - since;
}

// units that ask the world: each gets a test whose stubs are lean's own answers (design/w9al-world-stubs.md)
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
// an argument lean draws as a handle (an interface it answers member by member): the test passes an object built from
// lean's answers to the reads and calls the unit made of it, and asserts the calls
export interface Profile { name: string; id: number }
export interface Users { find(id: number): Promise<Profile | null>; count(): number }
export async function describeUser(users: Users, id: number): Promise<string> {
  const u = await users.find(id);
  return u ? `${u.name}#${u.id} of ${users.count()}` : `none of ${users.count()}`;
}

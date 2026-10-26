// concrete string helper assertions use the translator's emitted prelude
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { translate } from '../../translate/translate.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
if (!out) throw new Error('pass the absolute output .dfy path');
for (const [source, assertions, destination] of [
  ['probe.ts', 'assertions.dfy', out],
  ['real.ts', 'real-assertions.dfy', out.replace(/\.dfy$/, '.real.dfy')],
]) {
  const result = translate(path.join(here, source), null, { core: true, project: false });
  if (source === 'probe.ts' && (!result.main.includes('ext_String_Any') || !result.main.includes('ext_to_string_Any'))) throw new Error('unknown String and template conversions must remain distinct: symbols differ');
  fs.writeFileSync(destination, result.main + fs.readFileSync(path.join(here, assertions), 'utf8'));
  const r = spawnSync('dafny', ['verify', '--verification-time-limit', '30', destination], { encoding: 'utf8' });
  process.stdout.write((r.stdout ?? '') + (r.stderr ?? ''));
  if (r.status !== 0) process.exit(r.status ?? 1);
}

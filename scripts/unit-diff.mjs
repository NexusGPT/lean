import fs from 'node:fs';
import { ts, topLevelFunctions } from '../langs/ts/common.mjs';
const files = JSON.parse(fs.readFileSync(0, 'utf8'));
const units = (text, file) => {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  // the fixed census population uses the fork's function, constructor and method units
  return [...topLevelFunctions(sf)].filter(([, u]) => !u.accessor).map(([name,u]) => ({ name, start: sf.getLineAndCharacterOfPosition(u.node.getStart(sf)).line + 1, end: sf.getLineAndCharacterOfPosition(u.node.getEnd()).line + 1, form: u.cls ? 'method' : 'function' }));
};
console.log(JSON.stringify(files.flatMap(f => {
  const old = new Set(units(f.parent ?? '', f.path).map(u => u.name));
  return units(f.candidate, f.path).filter(u => !old.has(u.name)).map(u => ({ path: f.path, fileAbsent: f.parent === null, ...u }));
})));

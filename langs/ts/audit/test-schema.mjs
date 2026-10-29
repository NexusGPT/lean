import assert from 'node:assert/strict';
import {buildSchema} from './schema.mjs';
const s=buildSchema();
assert.equal(s.version,'5.9.3');
assert(s.kinds.some(k=>k.kind==='JSDocFunctionType'&&k.typeOnly));
for(const [kind,parent,field] of [['MethodDeclaration','ObjectLiteralExpression','properties'],['ArrowFunction','VariableDeclaration','initializer'],['FunctionDeclaration','SourceFile','statements']]) assert(s.candidates.some(c=>c.kind===kind&&c.parent===parent&&c.field===field),`${kind} ${parent}.${field}`);
assert(!s.candidates.some(c=>c.field==='parent' || c.field.startsWith('_')));
assert.equal(new Set(s.candidates.map(c=>c.id)).size,s.candidates.length);
console.log(JSON.stringify({version:s.version,kinds:s.kinds.length,fields:s.fields.length,candidates:s.candidates.length}));

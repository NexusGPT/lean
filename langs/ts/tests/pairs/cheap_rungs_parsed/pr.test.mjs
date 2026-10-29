import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import { prReport } from '../../../pr.mjs';
test('PR lint-refused unit receives a certified proof, retaining bounded evidence', async (t) => {
 // the fixture repository lives in the system temp folder, never inside the lean worktree
 const repo=fs.mkdtempSync(path.join(os.tmpdir(),'lean-rung-pr-'));
 t.after(()=>fs.rmSync(repo,{recursive:true,force:true}));
 const git=(...args)=>{const r=spawnSync('git',['-C',repo,...args],{encoding:'utf8'});process.stdout.write(r.stdout);process.stderr.write(r.stderr);assert.equal(r.status,0);return r.stdout.trim();};
 git('init');
 const file=path.join(repo,'f.ts');
 fs.writeFileSync(file,'export function f(x: number): number { var a = x; return a; }\n');
 git('add','f.ts');git('-c','user.name=Rung test','-c','user.email=rung-test@example.invalid','commit','-m','parent');
 fs.writeFileSync(file,'export function f(x: number): number { /* trivia */ var a = x; return a; }\n');
 const rows=await prReport({repo,base:'HEAD',head:'WORKTREE',n:3,project:false,fresh:true,dafnySeconds:5});
 const row=rows.find(r=>r.unit==='f');
 assert.ok(row);
 assert.equal(row.verdict,'PASS-proved',JSON.stringify(row));
 assert.equal(row.certificate.provedBy,'parsed-equal');
 assert.equal(row.laneA,'PASS-proved');
 assert.equal(row.laneB,'PASS-bounded');
 assert.equal(row.certificate.lanes.B.verdict,'PASS-bounded');
 assert.ok(row.certificate.identity);
});

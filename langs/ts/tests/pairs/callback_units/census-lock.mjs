import fs from 'node:fs';
const lock = '/tmp/claude-501/census.lock', owner = `${lock}/owner`;
let held = null;
export async function acquire() {
  for (;;) {
    try { fs.mkdirSync(lock); held = `callback-units ${process.pid}\n`; fs.writeFileSync(owner, held); return; }
    catch (e) { if (e.code !== 'EEXIST') throw e; }
    if (fs.existsSync(owner)) {
      const text = fs.readFileSync(owner, 'utf8'), pid = Number(text.match(/\b\d+\b/)?.[0]);
      if (pid > 0) try { process.kill(pid, 0); } catch (e) {
        if (e.code === 'ESRCH' && fs.existsSync(owner) && fs.readFileSync(owner, 'utf8') === text) {
          fs.unlinkSync(owner); fs.rmdirSync(lock); console.log(`removed dead-owner lock: ${text.trim()}`); continue;
        }
      }
      console.log(`census lock held by ${text.trim()}; retry in 60 s`);
    } else console.log('census lock owner pending; retry in 60 s');
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}
export function release() {
  if (held && fs.existsSync(owner) && fs.readFileSync(owner, 'utf8') === held) { fs.unlinkSync(owner); fs.rmdirSync(lock); }
  held = null;
}
export function setOwner(pid) { held = `callback-units ${pid}\n`; fs.writeFileSync(owner, held); }

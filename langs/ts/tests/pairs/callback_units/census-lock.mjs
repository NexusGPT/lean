import fs from 'node:fs';
const lock = '/tmp/claude-501/census.lock', owner = `${lock}/owner`, queue = '/tmp/claude-501/census.queue';
let held = null, ticket = null;
const removeTicket = () => { if (ticket && fs.existsSync(ticket)) fs.unlinkSync(ticket); ticket = null; };
process.on('exit', removeTicket);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { removeTicket(); process.kill(process.pid, signal); });
export async function acquire() {
  fs.mkdirSync(queue, { recursive: true });
  const name = `${Math.floor(Date.now()/1000)}-callback-units`;
  ticket = `${queue}/${name}`; fs.writeFileSync(ticket, '', { flag: 'wx' });
  for (;;) {
    const oldest = fs.readdirSync(queue).filter(n => /^\d+-/.test(n)).sort()[0];
    if (oldest !== name) { console.log(`census queue waits for ${oldest}; retry in 10 s`); await new Promise(resolve => setTimeout(resolve, 10000)); continue; }
    try { fs.mkdirSync(lock); held = `callback-units ${process.pid}\n`; fs.writeFileSync(owner, held); removeTicket(); return; }
    catch (e) { if (e.code !== 'EEXIST') throw e; }
    if (fs.existsSync(owner)) {
      const text = fs.readFileSync(owner, 'utf8'), pid = Number(text.match(/\b\d+\b/)?.[0]);
      if (pid > 0) try { process.kill(pid, 0); } catch (e) {
        if (e.code === 'ESRCH' && fs.existsSync(owner) && fs.readFileSync(owner, 'utf8') === text) {
          fs.unlinkSync(owner); fs.rmdirSync(lock); console.log(`removed dead-owner lock: ${text.trim()}`); continue;
        }
      }
      console.log(`census lock held by ${text.trim()}; retry in 10 s`);
    } else console.log('census lock owner pending; retry in 10 s');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}
export function release() {
  if (held && fs.existsSync(owner) && fs.readFileSync(owner, 'utf8') === held) { fs.unlinkSync(owner); fs.rmdirSync(lock); }
  held = null;
}
export function setOwner(pid) { held = `callback-units ${pid}\n`; fs.writeFileSync(owner, held); }

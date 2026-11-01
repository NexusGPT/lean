// vscode as a library fake: the editor API's shape as the extension code of the cline and gemini-cli repositories uses
// it, modelled over the recording proxy (design/w2d-library-rows.md). The module has no published implementation to
// run (the editor provides it), so each member below follows the API's documented contract (code.visualstudio.com/api/
// references/vscode-api), and every member it does not name is the recording proxy's, recorded as before.
//   window.showInformationMessage / showWarningMessage / showErrorMessage(message, [options], ...items): recorded with
//     their arguments; the answer is the user's choice, a seeded draw among the items the unit offered and undefined
//     (dismissed), so a unit that compares the choice with an item meets that item;
//   window.showQuickPick(items, options): recorded; one of the items (awaited if a promise) or undefined, a subset
//     under canPickMany; window.showInputBox(options): recorded; undefined (cancelled), options.value, or the world's string;
//   workspace.getConfiguration(section): recorded; a configuration record per section: get(key, default) is the
//     world's value for `section.key` when the world holds one (a seeded draw per key) and the default otherwise; has(key)
//     tells which; update(key, value) is recorded and a later get on the side reads the value written;
//   EventEmitter: `event(listener)` registers, `fire(data)` calls the listeners in order, `dispose()` drops them; each
//     registration returns a Disposable; Disposable: `dispose()` calls its function once; Disposable.from disposes all;
//   commands.registerCommand(id, fn): recorded, returns a Disposable; commands.executeCommand(id, ...args): recorded,
//     runs the side's own registered fn for id, else the world answers.
import { createHash } from 'node:crypto';
import { namePromise, render } from '../../fake.mjs';

const draw = (env, key) => createHash('sha256').update(`${env.seed}:vscode:${key}`).digest().readUInt32BE(0) / 4294967296;
const count = (env, path) => { const k = (env.calls.get(path) ?? 0) + 1; env.calls.set(path, k); return k; };

export function vscodeModule(env) {
  const rec = env.fake('module:vscode');
  const resolved = (path, value) => namePromise(env, Promise.resolve(value), path, { value });
  const call = (path, args) => { env.record('call', path, args.map((a) => render(a))); return count(env, path); };
  const message = (kind) => (msg, ...rest) => {
    const path = `module:vscode.window.${kind}`;
    const k = call(path, [msg, ...rest]);
    const items = rest.length && rest[0] && typeof rest[0] === 'object' && !('title' in rest[0]) ? rest.slice(1) : rest; // a leading MessageOptions ({ modal, detail }) is not an item
    const choices = [undefined, ...items];
    return resolved(`${path}()#${k}`, choices[Math.floor(draw(env, `${path}#${k}`) * choices.length)]);
  };
  class Disposable {
    constructor(fn) { this._fn = typeof fn === 'function' ? fn : null; }
    dispose() { const f = this._fn; this._fn = null; if (f) return f(); }
    static from(...ds) { return new Disposable(() => { for (const d of ds) d?.dispose?.(); }); }
  }
  class EventEmitter {
    constructor() { this._listeners = []; this.event = (listener, thisArg, disposables) => { const entry = { listener, thisArg }; this._listeners.push(entry); const d = new Disposable(() => { this._listeners = this._listeners.filter((e) => e !== entry); }); if (Array.isArray(disposables)) disposables.push(d); return d; }; }
    fire(data) { for (const { listener, thisArg } of [...this._listeners]) listener.call(thisArg, data); }
    dispose() { this._listeners = []; }
  }
  const windowOf = () => new Proxy(rec.window, { get(t, p, r) {
    if (p === 'showInformationMessage' || p === 'showWarningMessage' || p === 'showErrorMessage') return message(p);
    if (p === 'showQuickPick') return async (items, options) => {
      const path = 'module:vscode.window.showQuickPick'; const list = await items; const k = call(path, [list, options]);
      const u = draw(env, `${path}#${k}`), arr = Array.isArray(list) ? list : [];
      if (options?.canPickMany) return u < 0.25 ? undefined : arr.filter((_, i) => draw(env, `${path}#${k}:${i}`) < 0.5);
      const choices = [undefined, ...arr]; return choices[Math.floor(u * choices.length)];
    };
    if (p === 'showInputBox') return (options) => {
      const path = 'module:vscode.window.showInputBox'; const k = call(path, [options]); const u = draw(env, `${path}#${k}`);
      return resolved(`${path}()#${k}`, u < 1 / 3 ? undefined : u < 2 / 3 && typeof options?.value === 'string' ? options.value : env.primitive('string', `${path}()#${k}`));
    };
    return Reflect.get(t, p, r);
  } });
  const configs = (env.vscodeConfig ??= new Map()); // `section.key` -> the side's written value
  const getConfiguration = (section) => {
    const path = `module:vscode.workspace.getConfiguration`;
    const k = call(path, section === undefined ? [] : [section]);
    const at = (key) => (section ? `${section}.${key}` : String(key));
    const held = (key) => configs.has(at(key)) || draw(env, `config:${at(key)}`) < 0.5;
    return {
      get(key, dflt) { env.record('call', `${path}()#${k}.get`, [render(key), render(dflt)]); if (configs.has(at(key))) return configs.get(at(key)); return held(key) ? env.answer(`module:vscode.config(${at(key)})`) : dflt; },
      has(key) { env.record('call', `${path}()#${k}.has`, [render(key)]); return held(key); },
      update(key, value, target) { env.record('call', `${path}()#${k}.update`, [render(key), render(value), render(target)]); configs.set(at(key), value); return resolved(`${path}()#${k}.update`, undefined); },
      inspect(key) { env.record('call', `${path}()#${k}.inspect`, [render(key)]); return env.answer(`module:vscode.config(${at(key)})#inspect`); },
    };
  };
  const workspaceOf = () => new Proxy(rec.workspace, { get(t, p, r) { return p === 'getConfiguration' ? getConfiguration : Reflect.get(t, p, r); } });
  const registered = (env.vscodeCommands ??= new Map());
  const commandsOf = () => new Proxy(rec.commands, { get(t, p, r) {
    if (p === 'registerCommand' || p === 'registerTextEditorCommand') return (id, fn, thisArg) => { call(`module:vscode.commands.${p}`, [id, fn]); registered.set(id, { fn, thisArg }); return new Disposable(() => registered.delete(id)); };
    if (p === 'executeCommand') return (id, ...args) => {
      const path = 'module:vscode.commands.executeCommand'; const k = call(path, [id, ...args]);
      const own = registered.get(id);
      if (own) return Promise.resolve().then(() => own.fn.apply(own.thisArg, args));
      return resolved(`${path}()#${k}`, env.answer(`${path}()#${k}`));
    };
    return Reflect.get(t, p, r);
  } });
  // a namespace is made when the unit first reads it: that read is the proxy's, recorded as before
  const made = new Map(), makers = { window: windowOf, workspace: workspaceOf, commands: commandsOf }, classes = { EventEmitter, Disposable };
  const mod = new Proxy({}, { get(t, p) {
    if (p === '__esModule') return true;
    if (p === 'default') return mod;
    if (typeof p === 'string' && Object.hasOwn(classes, p)) return classes[p];
    if (typeof p === 'string' && Object.hasOwn(makers, p)) { if (!made.has(p)) made.set(p, makers[p]()); return made.get(p); }
    return rec[p];
  } });
  return mod;
}

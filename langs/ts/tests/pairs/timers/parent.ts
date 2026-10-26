// The virtual clock of lane B: a timer the call arms fires once after the call, in due order; a cleared timer leaves
// nothing; an interval re-arms and stays pending; a timer that arms another runs it too.
interface Port { send(message: string): void }
export function later(port: Port): number { setTimeout(() => port.send("x"), 100); return 1; }
export function armClear(port: Port): number { const id = setTimeout(() => port.send("x"), 100); clearTimeout(id); return 1; }
export function ordered(port: Port): number { setTimeout(() => port.send("b"), 200); setTimeout(() => port.send("a"), 100); return 2; }
export function everyTick(port: Port): number { setInterval(() => port.send("t"), 10); return 1; }
export function chain(port: Port): number { setTimeout(() => { setTimeout(() => port.send("deep"), 1); }, 1); return 1; }
export function frame(port: Port): number { requestAnimationFrame(() => port.send("f")); return 1; }

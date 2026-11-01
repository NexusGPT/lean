import { EventEmitter } from 'vscode';
// fire calls the listener the unit registered with the data fired (lane B: the vscode model of EventEmitter)
export function heard(n: number): number { const e = new EventEmitter<number>(); let got = -1; e.event((x) => { got = x; }); e.fire(n); return got === n ? 1 : 0; }

import { EventEmitter } from 'vscode';
export function heard(n: number): number { const e = new EventEmitter<number>(); let got = -1; e.event((x) => { got = x; }); e.fire(n); return 0; }

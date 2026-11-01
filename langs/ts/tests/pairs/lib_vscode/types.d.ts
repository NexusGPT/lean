// the vscode declarations the pair reads (@types/vscode, narrowed)
declare module 'vscode' {
  export interface Disposable { dispose(): void; }
  export class EventEmitter<T> { event: (listener: (e: T) => void) => Disposable; fire(data: T): void; }
}

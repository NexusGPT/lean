export interface Port { get(id: string): Promise<string>; count(id: string): Promise<number>; log(m: string): Promise<void>; }

export interface Store { get(id: string): Promise<number>; put(id: string, n: number): Promise<void>; }

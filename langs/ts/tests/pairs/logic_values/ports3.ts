export interface Repo { get(id: string): Promise<string>; has(id: string): Promise<boolean>; }

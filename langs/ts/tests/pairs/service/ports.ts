export interface Repo { find(id: string): Promise<{ id: string; n: number } | null>; }
export interface Audit { log(tag: string, who: string): Promise<void>; }

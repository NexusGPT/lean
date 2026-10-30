declare module "ext-db" { export function query(text: string): Promise<{ rows: unknown }>; }

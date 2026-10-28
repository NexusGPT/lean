export interface Mailer { send(to: string): Promise<void>; }

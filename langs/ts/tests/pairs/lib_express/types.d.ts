// the express declarations the pair reads (@types/express, narrowed)
declare module 'express' {
  export interface Request { params: Record<string, string>; }
  export interface Response { status(code: number): Response; json(body: unknown): Response; statusCode: number; }
}

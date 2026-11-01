import type { Request, Response } from 'express';
// res.status answers the response itself, and the code set is the code read (lane B: the express response model)
export function created(req: Request, res: Response): number { const r = res.status(201); const c = res.statusCode; return r === res && c === 201 ? 1 : 0; }

import type { Request, Response } from 'express';
export function created(req: Request, res: Response): number { const r = res.status(201); const c = res.statusCode; return 0; }

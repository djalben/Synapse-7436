import { handle } from 'hono/vercel';
import app from '../src/api/index.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Все /api/* запросы перенаправляются сюда через vercel.json rewrites.
// Hono app использует basePath('/api'), поэтому пути совпадают 1:1.
export default handle(app);

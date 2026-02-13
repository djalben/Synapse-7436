import { handle } from 'hono/vercel';
import app from '../src/api/index.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Catch-all: все /api/* запросы обрабатываются Hono
export default handle(app);

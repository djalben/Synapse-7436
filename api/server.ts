import { Hono } from 'hono';
import { handle } from 'hono/vercel';

// Standalone — zero imports from src/api to isolate the hang
const app = new Hono();
app.get('/ping', (c) => c.json({ pong: Date.now(), standalone: true }));
app.all('*', (c) => c.json({ path: c.req.path, method: c.req.method }, 404));

export const runtime = 'nodejs';
export const maxDuration = 60;

export default handle(app);

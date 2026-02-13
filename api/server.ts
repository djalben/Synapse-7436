export const runtime = 'edge';

declare const EdgeRuntime: string | undefined;
import app from '../src/api/index.js';

// Bypass hono/vercel handle() — call app.fetch() directly on Edge
export default async function handler(req: Request): Promise<Response> {
  console.log('Runtime check:', typeof EdgeRuntime !== 'undefined' ? 'edge' : 'node');
  console.log('Handler called:', req.method, req.url);
  const res = app.fetch(req);
  console.log('app.fetch() returned, type:', typeof res, res instanceof Promise ? 'Promise' : 'not-Promise');
  return res;
}

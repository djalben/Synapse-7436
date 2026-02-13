export const runtime = 'edge';

import app from '../src/api/index.js';

// Bypass hono/vercel handle() — call app.fetch() directly on Edge
export default async function handler(req: Request): Promise<Response> {
  return app.fetch(req);
}

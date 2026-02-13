import { handle } from 'hono/vercel';
import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../src/api/index.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const honoHandler = handle(app);

// Single entry point: all /api/* → here via vercel.json rewrites.
// Raw bypass at /api/raw-test to verify Vercel function works without Hono.
export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || '';
  console.log(`[Vercel] ${req.method} ${url}`);

  // Bypass Hono entirely — pure Node.js response
  if (url.includes('raw-test')) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, bypass: true, url, method: req.method, ts: Date.now() }));
    return;
  }

  return honoHandler(req, res);
}

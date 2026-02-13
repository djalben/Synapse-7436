import type { IncomingMessage, ServerResponse } from 'node:http';

export const runtime = 'nodejs';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ pure: 'nodejs', ts: Date.now(), url: req.url }));
}

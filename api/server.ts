import type { IncomingMessage, ServerResponse } from 'node:http';
import app from '../src/api/index.js';

export const maxDuration = 60;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    // Build Web Request from Node.js IncomingMessage
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const url = `${proto}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val) headers.set(key, Array.isArray(val) ? val.join(', ') : val);
    }

    let body: Buffer | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await new Promise<Buffer>((resolve) => {
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks)));
      });
    }

    const webReq = new Request(url, { method: req.method, headers, body });
    const webRes = await app.fetch(webReq);

    // Pipe Web Response back to Node.js ServerResponse
    const resHeaders: Record<string, string> = {};
    webRes.headers.forEach((v, k) => { resHeaders[k] = v; });
    res.writeHead(webRes.status, resHeaders);

    const arrayBuf = await webRes.arrayBuffer();
    res.end(Buffer.from(arrayBuf));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error', detail: String(err) }));
  }
}

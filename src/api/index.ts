// Vercel Node.js runtime — 60 seconds max
export const runtime = 'nodejs';
export const maxDuration = 60;

import { Hono } from 'hono';
import { chatRoutes } from './routes/chat.js'
import { imageRoutes } from './routes/image.js'
import { videoRoutes } from './routes/video.js'
import { enhanceRoutes } from './routes/enhance.js'
import { audioRoutes } from './routes/audio.js'
import { avatarRoutes } from './routes/avatar.js'
import { webhookRoutes } from './routes/webhook.js'
import { monitoringRoutes } from './monitoring.js'

console.log('[INIT] Hono app module loaded')

const app = new Hono()

// ─── MW1: Logging + timing
app.use('*', async (c, next) => {
  console.log(`[MW1-LOG] START ${c.req.method} ${c.req.path}`)
  await next()
  console.log(`[MW1-LOG] END ${c.req.method} ${c.req.path}`)
})

// ─── MW2: CORS (safe for Vercel Node.js — no c.req.header / raw.headers.get)
app.use('*', async (c, next) => {
  console.log(`[MW2-CORS] START method=${c.req.method}`)
  if (c.req.method === 'OPTIONS') {
    console.log(`[MW2-CORS] OPTIONS preflight → 204`)
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Plan',
        'Access-Control-Max-Age': '86400',
      },
    })
  }
  console.log(`[MW2-CORS] calling next()...`)
  await next()
  console.log(`[MW2-CORS] END, setting headers`)
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Plan')
})

// ─── Global error handler
app.onError((err, c) => {
  console.error('[API] Error:', err)
  return c.json({ error: 'Internal server error', message: err.message }, 500)
})

// ─── Health / Debug
app.get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}`, provider: 'openrouter' }));
app.get('/debug', (c) => {
  console.log(`[ROUTE] /debug handler fired`)
  return c.json({
    path: c.req.path,
    method: c.req.method,
    url: c.req.url,
    provider: 'openrouter',
    hasApiKey: !!process.env.OPENROUTER_API_KEY,
    registeredRoutes: [
      '/ping',
      '/debug',
      '/chat',
      '/image',
      '/video',
      '/enhance',
      '/audio',
      '/avatar',
      '/webhook',
      '/monitoring',
    ],
  });
});

// ─── Routes (Vercel strips /api prefix before passing to Hono)
app.route('/chat', chatRoutes);
app.route('/image', imageRoutes);
app.route('/video', videoRoutes);
app.route('/enhance', enhanceRoutes);
app.route('/audio', audioRoutes);
app.route('/avatar', avatarRoutes);
app.route('/webhook', webhookRoutes);
app.route('/monitoring', monitoringRoutes);

// ─── 404 fallback
app.notFound((c) => {
  console.error("[API] Route not found:", { path: c.req.path, method: c.req.method, url: c.req.url })
  return c.json({ 
    error: `Route not found: ${c.req.path}`,
    method: c.req.method,
    url: c.req.url,
    availableRoutes: ['/ping', '/debug', '/chat', '/image', '/video', '/enhance', '/audio', '/avatar', '/webhook', '/monitoring']
  }, 404);
});

export default app;

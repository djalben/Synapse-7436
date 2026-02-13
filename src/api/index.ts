import { Hono } from 'hono';
import { chatRoutes } from './routes/chat.js';
import { imageRoutes } from './routes/image.js';
import { videoRoutes } from './routes/video.js';
import { enhanceRoutes } from './routes/enhance.js';
import { audioRoutes } from './routes/audio.js';
import { avatarRoutes } from './routes/avatar.js';
import { webhookRoutes } from './routes/webhook.js';
import { monitoringRoutes } from './monitoring.js';

const app = new Hono().basePath('/api');

// ─── Only basic logging (all other MW disabled for isolation test)
app.use('*', async (c, next) => {
  const t0 = Date.now();
  console.log(`[HONO] ${c.req.method} ${c.req.path}`);
  await next();
  console.log(`[HONO] Done ${c.req.method} ${c.req.path} ${Date.now() - t0}ms`);
});

// ─── Error handler
app.onError((err, c) => {
  console.error('[API] Error:', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

// ─── Health / Debug
app.get('/ping', (c) => c.json({ pong: Date.now(), runtime: 'nodejs' }));
app.get('/debug', (c) => c.json({
  path: c.req.path,
  method: c.req.method,
  url: c.req.url,
  runtime: 'nodejs',
  hasApiKey: !!process.env.OPENROUTER_API_KEY,
}));

// ─── Routes
app.route('/chat', chatRoutes);
app.route('/image', imageRoutes);
app.route('/video', videoRoutes);
app.route('/enhance', enhanceRoutes);
app.route('/audio', audioRoutes);
app.route('/avatar', avatarRoutes);
app.route('/webhook', webhookRoutes);
app.route('/monitoring', monitoringRoutes);

// ─── 404
app.notFound((c) => {
  console.error('[API] 404:', c.req.path);
  return c.json({ error: `Not found: ${c.req.path}`, url: c.req.url }, 404);
});

export default app;

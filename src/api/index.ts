import { Hono } from 'hono';
import { cors } from "hono/cors"
import { prettyJSON } from "hono/pretty-json"
import { trimTrailingSlash } from "hono/trailing-slash"
import { chatRoutes } from './routes/chat.js'
import { imageRoutes } from './routes/image.js'
import { videoRoutes } from './routes/video.js'
import { enhanceRoutes } from './routes/enhance.js'
import { audioRoutes } from './routes/audio.js'
import { avatarRoutes } from './routes/avatar.js'
import { webhookRoutes } from './routes/webhook.js'

// basePath('/api') — все роуты доступны как /api/... (фронт должен слать /api/image без слеша в конце)
const app = new Hono().basePath('/api')

// Глобальное логирование всех входящих запросов
app.use('*', async (c, next) => {
  const url = new URL(c.req.url)
  console.log(`[DEBUG] ${c.req.method} ${url.pathname} (full URL: ${c.req.url})`)
  await next()
})

app.use('*', trimTrailingSlash())
app.use('*', prettyJSON())
app.use('*', cors({
  origin: "*",
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Debug: /api/ping, /api/debug
app.get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }));
app.get('/debug', (c) => {
  const url = new URL(c.req.url)
  return c.json({
    path: url.pathname,
    method: c.req.method,
    url: c.req.url,
    registeredRoutes: [
      '/api/ping',
      '/api/debug',
      '/api/chat',
      '/api/image',
      '/api/video',
      '/api/enhance',
      '/api/audio',
      '/api/avatar',
      '/api/webhook',
    ],
  });
});

// Роуты: /api/chat, /api/image, ... (без лишних слешей)
// Порядок важен: более специфичные роуты должны быть выше
app.route('/chat', chatRoutes);
app.route('/image', imageRoutes);
app.route('/video', videoRoutes);
app.route('/enhance', enhanceRoutes);
app.route('/audio', audioRoutes);
app.route('/avatar', avatarRoutes);
app.route('/webhook', webhookRoutes);

// Fallback для несуществующих роутов
app.notFound((c) => {
  const url = new URL(c.req.url)
  const pathname = url.pathname
  console.error("[API] Route not found:", {
    path: pathname,
    method: c.req.method,
    url: c.req.url,
  });
  
  return c.json({ 
    error: `Route not found: ${pathname}`,
    method: c.req.method,
    url: c.req.url,
    availableRoutes: ['/api/ping', '/api/debug', '/api/chat', '/api/image', '/api/video', '/api/enhance', '/api/audio', '/api/avatar', '/api/webhook']
  }, 404);
});

export default app;

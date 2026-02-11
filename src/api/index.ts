import { Hono } from 'hono';
import { cors } from "hono/cors"
import { chatRoutes } from './routes/chat.js'
import { imageRoutes } from './routes/image.js'
import { videoRoutes } from './routes/video.js'
import { enhanceRoutes } from './routes/enhance.js'
import { audioRoutes } from './routes/audio.js'
import { avatarRoutes } from './routes/avatar.js'
import { webhookRoutes } from './routes/webhook.js'

// Создаем приложение без basePath для Cloudflare Workers
// В Cloudflare Workers basePath может создавать проблемы с маршрутизацией
const app = new Hono()

app.use('*', cors({
  origin: "*",
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Debug endpoint - доступен по /api/ping
app.get('/api/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }));

// Debug endpoint для проверки маршрутизации
app.get('/api/debug', (c) => {
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
      '/api/webhook'
    ]
  });
});

// Подключаем роуты с полным путем /api/*
app.route('/api/chat', chatRoutes);
app.route('/api/image', imageRoutes);
app.route('/api/video', videoRoutes);
app.route('/api/enhance', enhanceRoutes);
app.route('/api/audio', audioRoutes);
app.route('/api/avatar', avatarRoutes);
app.route('/api/webhook', webhookRoutes);

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

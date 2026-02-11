import { Hono } from 'hono';
import { cors } from "hono/cors"
import { chatRoutes } from './routes/chat'
import { imageRoutes } from './routes/image'
import { videoRoutes } from './routes/video'
import { enhanceRoutes } from './routes/enhance'
import { audioRoutes } from './routes/audio'
import { avatarRoutes } from './routes/avatar'
import { webhookRoutes } from './routes/webhook'

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
  return c.json({ 
    path: c.req.path,
    method: c.req.method,
    url: c.req.url,
    rawPath: c.req.raw.path,
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
  console.error("[API] Route not found:", {
    path: c.req.path,
    method: c.req.method,
    url: c.req.url,
    rawPath: c.req.raw.path,
  });
  
  return c.json({ 
    error: `Route not found: ${c.req.path}`,
    method: c.req.method,
    url: c.req.url,
    availableRoutes: ['/api/ping', '/api/debug', '/api/chat', '/api/image', '/api/video', '/api/enhance', '/api/audio', '/api/avatar', '/api/webhook']
  }, 404);
});

export default app;

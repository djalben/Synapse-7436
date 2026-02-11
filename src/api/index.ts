import { Hono } from 'hono';
import { cors } from "hono/cors"
import { chatRoutes } from './routes/chat'
import { imageRoutes } from './routes/image'
import { videoRoutes } from './routes/video'
import { enhanceRoutes } from './routes/enhance'
import { audioRoutes } from './routes/audio'
import { avatarRoutes } from './routes/avatar'
import { webhookRoutes } from './routes/webhook'

const app = new Hono()
  .basePath('/api');

app.use('*', cors({
  origin: "*",
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }));

// Debug endpoint to check routing
app.get('/debug', (c) => {
  return c.json({ 
    path: c.req.path,
    method: c.req.method,
    url: c.req.url,
    routes: ['/chat', '/image', '/video', '/enhance', '/audio', '/avatar', '/webhook']
  });
});

app.route('/chat', chatRoutes);
app.route('/image', imageRoutes);
app.route('/video', videoRoutes);
app.route('/enhance', enhanceRoutes);
app.route('/audio', audioRoutes);
app.route('/avatar', avatarRoutes);
app.route('/webhook', webhookRoutes);

// Fallback для несуществующих роутов
app.notFound((c) => {
  return c.json({ 
    error: `Route not found: ${c.req.path}`,
    method: c.req.method,
    availableRoutes: ['/api/ping', '/api/chat', '/api/image', '/api/video', '/api/enhance', '/api/audio', '/api/avatar', '/api/webhook']
  }, 404);
});

export default app;

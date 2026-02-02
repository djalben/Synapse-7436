import { Hono } from 'hono';
import { cors } from "hono/cors"
import { chatRoutes } from './routes/chat'
import { imageRoutes } from './routes/image'
import { videoRoutes } from './routes/video'

const app = new Hono()
  .basePath('api');

app.use(cors({
  origin: "*"
}))

app.get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }));
app.route('/chat', chatRoutes);
app.route('/image', imageRoutes);
app.route('/video', videoRoutes);

export default app;

import { Hono } from 'hono';
import { cors } from "hono/cors"
import { chatRoutes } from './routes/chat'

const app = new Hono()
  .basePath('api');

app.use(cors({
  origin: "*"
}))

app.get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }));
app.route('/chat', chatRoutes);

export default app;
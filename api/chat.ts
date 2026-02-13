// Этот файл больше не используется — весь роутинг через api/index.ts → Hono basePath('/api')
// Оставлен как заглушка на случай прямого вызова Vercel
import { handle } from 'hono/vercel';
import app from '../src/api/index.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

export default handle(app);

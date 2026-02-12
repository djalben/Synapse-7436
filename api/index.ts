import { handle } from 'hono/vercel';
import app from '../src/api/index.js';

// Serverless (Node.js) вместо Edge — даём функции 60 секунд на работу
export const runtime = 'nodejs';
export const maxDuration = 60;

export default handle(app);

import { handle } from 'hono/vercel';
import app from '../src/api/index.js';

// Edge runtime — native Web Request/Response, no Node.js adapter issues
export const runtime = 'edge';

export default handle(app);

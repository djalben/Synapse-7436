// Force Edge Runtime — do NOT use Node.js adapter
export const runtime = 'edge';

import { handle } from 'hono/vercel';
import app from '../src/api/index.js';

export default handle(app);

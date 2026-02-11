import { drizzle } from 'drizzle-orm/d1';
import { env } from "cloudflare:workers";
import * as schema from './schema.js';

export const database = drizzle(env.DB, { schema });

// Re-export schema for use elsewhere
export * from './schema.js';

// Vercel Serverless Function adapter for Hono app
// This file exports the Hono app for Vercel Edge Runtime
import app from '../src/api/index';

// Export config for Vercel Edge Runtime
export const config = {
  runtime: 'edge',
};

// For Vercel, we need to export a handler function
// Hono app can be used directly as a handler in Edge Runtime
export default app.fetch;

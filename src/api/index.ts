// Переключаем с 'edge' на 'nodejs' и увеличиваем время (дублируем в api/index.ts для ясности)
export const runtime = 'nodejs';
export const maxDuration = 60; // Даем функции 60 секунд на работу

import { Hono, Context } from 'hono';
import { prettyJSON } from "hono/pretty-json"
import { trimTrailingSlash } from "hono/trailing-slash"
import { env as getRuntimeEnv } from "hono/adapter"
import { chatRoutes } from './routes/chat.js'
import { imageRoutes } from './routes/image.js'
import { videoRoutes } from './routes/video.js'
import { enhanceRoutes } from './routes/enhance.js'
import { audioRoutes } from './routes/audio.js'
import { avatarRoutes } from './routes/avatar.js'
import { webhookRoutes } from './routes/webhook.js'
import { monitoringRoutes } from './monitoring.js'
import { 
  type SynapseTier, 
  getRequiredTierForImageModel, 
  checkTierAccess, 
  planToTier 
} from '../config/tiers.js'

// Environment variables type for Hono context
type Env = {
  AIMLAPI_KEY?: string
  REPLICATE_API_TOKEN?: string
  VITE_BASE_URL?: string
  TELEGRAM_BOT_TOKEN?: string
  TELEGRAM_CHAT_ID?: string
}

const AIMLAPI_BASE_URL = "https://api.aimlapi.com/v1"

// Роутинг без basePath: Vercel передаёт path /image, /ping. safeCors() без .headers.get() — совместимость с Node.js.
const app = new Hono()

// Глобальное логирование всех входящих запросов (стандартные пути Hono)
app.use('*', async (c, next) => {
  console.log(`[DEBUG] ${c.req.method} ${c.req.path} (url: ${c.req.url})`)
  await next()
})

app.use('*', trimTrailingSlash())
app.use('*', prettyJSON())

// CORS без c.req.header(): на Vercel Node.js raw.headers может быть объектом без .get()
app.use('*', async (c: Context, next) => {
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    })
  }
  await next()
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
})

// Глобальный обработчик ошибок — сразу возвращаем JSON, чтобы Vercel не висел 60 сек при сбоях
app.onError((err, c) => {
  console.error('[API] Error:', err)
  return c.json({ error: 'Internal server error', message: err.message }, 500)
})

// Debug: /api/ping, /api/debug
app.get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }));
app.get('/debug', (c) => {
  return c.json({
    path: c.req.path,
    method: c.req.method,
    url: c.req.url,
    registeredRoutes: [
      '/api/ping',
      '/api/debug',
      '/api/models-debug',
      '/api/chat',
      '/api/image',
      '/api/video',
      '/api/enhance',
      '/api/audio',
      '/api/avatar',
      '/api/webhook',
      '/api/monitoring',
    ],
  });
});

// Диагностика: получение списка доступных моделей AIMLAPI
app.get('/models-debug', async (c) => {
  console.log(`[DEBUG] /models-debug called`)
  try {
    const runtimeEnv = getRuntimeEnv<Env>(c)
    const aimlapiKey = runtimeEnv?.AIMLAPI_KEY
    
    if (!aimlapiKey) {
      return c.json({ error: "AIMLAPI_KEY not found" }, 503 as const)
    }
    
    console.log(`[DEBUG] Fetching models from AIMLAPI`)
    const response = await fetch(`${AIMLAPI_BASE_URL}/models`, {
      headers: { 
        'Authorization': `Bearer ${aimlapiKey}`,
        'Content-Type': 'application/json',
      }
    })
    
    console.log(`[DEBUG] Models API response:`, { status: response.status, ok: response.ok })
    
    if (!response.ok) {
      const errorText = await response.text()
      return c.json({ 
        error: "Failed to fetch models",
        status: response.status,
        errorText: errorText.substring(0, 500),
      }, response.status >= 500 ? 500 as const : response.status as 400 | 401 | 403)
    }
    
    const data = (await response.json()) as { data?: Array<{ id: string; name?: string; context_length?: number }> }
    const list = Array.isArray(data.data) ? data.data : []
    const fluxModels = list.filter((m) => m.id && m.id.includes('flux'))
    
    return c.json({
      total: list.length,
      fluxModels: fluxModels.map((m) => ({ id: m.id, name: m.name, context_length: m.context_length })),
      allModels: list.map((m) => m.id),
    })
  } catch (error) {
    console.error(`[DEBUG] Models debug error:`, error)
    return c.json({ 
      error: "Failed to fetch models",
      debug_error: error instanceof Error ? error.message : String(error),
    }, 500 as const)
  }
});

// Роуты: /api/chat, /api/image, ... (без лишних слешей)
// Порядок важен: более специфичные роуты должны быть выше
app.route('/chat', chatRoutes);

// Прямой вызов AIMLAPI: POST /image → https://api.aimlapi.com/v1/images/generations
app.post('/image', async (c) => {
  const startTime = Date.now()
  console.log(`[IMAGE] Request start at ${new Date().toISOString()}`)
  
  // Таймаут на весь запрос: 20 секунд (запас до 60-секундного лимита Vercel)
  const globalTimeout = setTimeout(() => {
    console.error(`[IMAGE] Global timeout after ${Date.now() - startTime}ms`)
  }, 20000)
  
  try {
    const aimlapiKey = getRuntimeEnv<Env>(c)?.AIMLAPI_KEY ?? (typeof process !== "undefined" ? process.env.AIMLAPI_KEY : undefined)
    
    if (!aimlapiKey) {
      clearTimeout(globalTimeout)
      console.error(`[IMAGE] AIMLAPI_KEY missing`)
      return c.json({ error: "Image generation service is not available. Please check API configuration." }, 503 as const)
    }
    
    console.log(`[IMAGE] Key found, parsing body, elapsed: ${Date.now() - startTime}ms`)
    
    let body: { prompt?: string; aspectRatio?: string; numImages?: number; style?: string; engine?: string }
    try {
      body = await c.req.json() as typeof body
      console.log(`[IMAGE] Body parsed, elapsed: ${Date.now() - startTime}ms`)
    } catch (jsonErr) {
      clearTimeout(globalTimeout)
      console.error(`[IMAGE] JSON parse error:`, jsonErr)
      return c.json({ error: "Invalid JSON in request body" }, 400 as const)
    }
  
    const prompt = body.prompt?.trim()
    if (!prompt) {
      clearTimeout(globalTimeout)
      return c.json({ error: "Please enter a prompt to generate an image." }, 400 as const)
    }
    
    const sizeMap: Record<string, string> = { "1:1": "1024x1024", "16:9": "1344x768", "9:16": "768x1344" }
    const size = sizeMap[body.aspectRatio || "1:1"] ?? "1024x1024"
    
    const url = "https://api.aimlapi.com/v1/images/generations"
    const payload = { model: "flux/schnell", prompt, n: body.numImages || 1, size }
    const headers = { "Authorization": `Bearer ${aimlapiKey}`, "Content-Type": "application/json" }
    
    console.log(`[IMAGE] Starting fetch to AIMLAPI, elapsed: ${Date.now() - startTime}ms`)
    
    // Таймаут fetch: 15 секунд
    const controller = new AbortController()
    const fetchTimeout = setTimeout(() => {
      console.error(`[IMAGE] Fetch timeout after ${Date.now() - startTime}ms, aborting`)
      controller.abort()
    }, 15000)
    
    try {
      const fetchStart = Date.now()
      const response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers,
        body: JSON.stringify(payload),
      })
      
      clearTimeout(fetchTimeout)
      console.log(`[IMAGE] Fetch completed, status: ${response.status}, elapsed: ${Date.now() - fetchStart}ms`)
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        console.error(`[IMAGE] AIMLAPI error ${response.status}:`, errorText.slice(0, 500))
        clearTimeout(globalTimeout)
        const code = response.status >= 500 ? 500 : (response.status >= 400 ? response.status : 500)
        return c.json({ error: "Failed to generate image. Please try again.", status: response.status }, code as 400 | 401 | 403 | 429 | 500)
      }
      
      const jsonStart = Date.now()
      const data = await response.json() as { data?: Array<{ url?: string; b64_json?: string }> }
      console.log(`[IMAGE] JSON parsed, elapsed: ${Date.now() - jsonStart}ms`)
      
      if (data.data?.length) {
        const images = data.data.map((img, idx) => {
          const imageUrl = img.url ?? (img.b64_json ? `data:image/png;base64,${img.b64_json}` : null)
          return imageUrl ? {
            id: `${Date.now()}-${idx}`,
            url: imageUrl,
            prompt,
            aspectRatio: body.aspectRatio || "1:1",
            style: body.style || "photorealistic",
            mode: "text-to-image",
            createdAt: new Date().toISOString(),
            creditCost: 1,
          } : null
        }).filter(Boolean) as Array<{ id: string; url: string; prompt: string; aspectRatio: string; style: string; mode: string; createdAt: string; creditCost: number }>
        
        clearTimeout(globalTimeout)
        console.log(`[IMAGE] Success, total elapsed: ${Date.now() - startTime}ms`)
        return c.json({ images, totalCreditCost: images.length }, 201 as const)
      }
      
      clearTimeout(globalTimeout)
      return c.json({ error: "No images generated" }, 500 as const)
    } catch (fetchError) {
      clearTimeout(fetchTimeout)
      clearTimeout(globalTimeout)
      const elapsed = Date.now() - startTime
      const isAbort = fetchError instanceof Error && fetchError.name === 'AbortError'
      console.error(`[IMAGE] Error after ${elapsed}ms:`, isAbort ? 'TIMEOUT' : fetchError)
      return c.json({ error: isAbort ? "Request timeout. Please try again." : "Network error. Please try again." }, 503 as const)
    }
  } catch (err) {
    clearTimeout(globalTimeout)
    const elapsed = Date.now() - startTime
    console.error(`[IMAGE] Unexpected error after ${elapsed}ms:`, err)
    return c.json({ error: "Internal error. Please try again." }, 500 as const)
  }
})

// GET /api/image для проверки доступности
app.get('/image', (c) => {
  console.log(`[DEBUG] GET /image called`)
  return c.json({ ok: true, message: "Image API. Use POST to generate images." })
})

// Остальные роуты через imageRoutes (для статуса и других методов)
app.route('/image', imageRoutes);
app.route('/video', videoRoutes);
app.route('/enhance', enhanceRoutes);
app.route('/audio', audioRoutes);
app.route('/avatar', avatarRoutes);
app.route('/webhook', webhookRoutes);
app.route('/monitoring', monitoringRoutes);

// Fallback для несуществующих роутов (стандартные пути Hono)
app.notFound((c) => {
  console.error("[API] Route not found:", { path: c.req.path, method: c.req.method, url: c.req.url })
  return c.json({ 
    error: `Route not found: ${c.req.path}`,
    method: c.req.method,
    url: c.req.url,
    availableRoutes: ['/api/ping', '/api/debug', '/api/chat', '/api/image', '/api/video', '/api/enhance', '/api/audio', '/api/avatar', '/api/webhook', '/api/monitoring']
  }, 404);
});

export default app;

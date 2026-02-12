import { Hono } from 'hono';
import { cors } from "hono/cors"
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
import { 
  type SynapseTier, 
  getRequiredTierForImageModel, 
  checkTierAccess, 
  planToTier 
} from '../config/tiers.js'

// Environment variables type for Hono context
type Env = {
  OPENROUTER_API_KEY?: string
  REPLICATE_API_TOKEN?: string
  VITE_BASE_URL?: string
}

// basePath('/api') — все роуты доступны как /api/... (фронт должен слать /api/image без слеша в конце)
const app = new Hono().basePath('/api')

// Глобальное логирование всех входящих запросов
app.use('*', async (c, next) => {
  const url = new URL(c.req.url)
  console.log(`[DEBUG] ${c.req.method} ${url.pathname} (full URL: ${c.req.url})`)
  await next()
})

app.use('*', trimTrailingSlash())
app.use('*', prettyJSON())
app.use('*', cors({
  origin: "*",
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Debug: /api/ping, /api/debug
app.get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }));
app.get('/debug', (c) => {
  const url = new URL(c.req.url)
  return c.json({
    path: url.pathname,
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
    ],
  });
});

// Диагностика: получение списка доступных моделей OpenRouter
app.get('/models-debug', async (c) => {
  console.log(`[DEBUG] /models-debug called`)
  try {
    const runtimeEnv = getRuntimeEnv<Env>(c)
    const openRouterKey = runtimeEnv?.OPENROUTER_API_KEY
    
    if (!openRouterKey) {
      return c.json({ error: "OPENROUTER_API_KEY not found" }, 503 as const)
    }
    
    console.log(`[DEBUG] Fetching models from OpenRouter`)
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://synapse-7436.vercel.app',
        'X-Title': 'Synapse AI Studio',
      }
    })
    
    console.log(`[DEBUG] Models API response:`, {
      status: response.status,
      ok: response.ok,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      return c.json({ 
        error: "Failed to fetch models",
        status: response.status,
        errorText: errorText.substring(0, 500),
      }, response.status >= 500 ? 500 as const : response.status as 400 | 401 | 403)
    }
    
    const data = (await response.json()) as any
    
    // Фильтруем только Flux модели для удобства
    const fluxModels = Array.isArray(data.data) 
      ? data.data.filter((m: any) => m.id && m.id.includes('flux'))
      : []
    
    return c.json({
      total: Array.isArray(data.data) ? data.data.length : 0,
      fluxModels: fluxModels.map((m: any) => ({
        id: m.id,
        name: m.name,
        context_length: m.context_length,
      })),
      allModels: Array.isArray(data.data) ? data.data.map((m: any) => m.id) : [],
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

// Прямой роут POST /api/image для упрощения маршрутизации Vercel Edge
app.post('/image', async (c) => {
  console.log(`[DEBUG] Request URL:`, c.req.url)
  console.log(`[DEBUG] Request path:`, new URL(c.req.url).pathname)
  console.log(`[DEBUG] POST /image handler called`)
  const requestStartTime = Date.now()
  
  // Получение env переменных через getRuntimeEnv (стандарт Vercel Edge)
  const runtimeEnv = getRuntimeEnv<Env>(c)
  const openRouterKey = runtimeEnv?.OPENROUTER_API_KEY
  const replicateToken = runtimeEnv?.REPLICATE_API_TOKEN
  
  console.log(`[DEBUG] Environment check:`, {
    hasOpenRouterKey: !!openRouterKey,
    hasReplicateToken: !!replicateToken,
  })
  
  if (!openRouterKey) {
    console.error(`[DEBUG] OPENROUTER_API_KEY missing`)
    return c.json({ error: "Image generation service is not available. Please check API configuration." }, 503 as const)
  }
  
  // Стандартизация JSON: парсинг тела запроса с обработкой ошибок
  let body: {
    prompt?: string
    aspectRatio?: string
    numImages?: number
    style?: string
    mode?: string
    referenceImage?: string
    specializedEngine?: string
    engine?: string
  }
  
  try {
    body = await c.req.json() as typeof body
    console.log(`[DEBUG] Request body parsed:`, {
      hasPrompt: !!body.prompt,
      engine: body.engine || "default",
      mode: body.mode || "text-to-image",
    })
  } catch (jsonError) {
    console.error(`[DEBUG] JSON parse error:`, jsonError)
    return c.json({ error: "Invalid JSON in request body" }, 400 as const)
  }
  
  const { prompt, aspectRatio, numImages, style, referenceImage, specializedEngine, engine, mode } = body
  
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return c.json({ error: "Please enter a prompt to generate an image." }, 400 as const)
  }
  
  // Aspect ratio mapping
  const ASPECT_RATIO_MAP: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "16:9": { width: 1344, height: 768 },
    "9:16": { width: 768, height: 1344 },
  }
  const size = ASPECT_RATIO_MAP[aspectRatio || "1:1"] || ASPECT_RATIO_MAP["1:1"]
  
  // Prompt enhancement
  let enhancedPrompt = prompt.trim()
  if (specializedEngine === "niji-v6") {
    enhancedPrompt += ", anime masterpiece, niji style, vibrant colors, high quality anime art"
  } else if (style && style !== "none") {
    const stylePrompts: Record<string, string> = {
      photorealistic: ", photorealistic, 8k, ultra detailed",
      anime: ", anime style, manga art, vibrant colors",
      "3d": ", 3D render, Pixar style, CGI",
      cyberpunk: ", cyberpunk, neon lights, futuristic",
    }
    enhancedPrompt += stylePrompts[style] || ""
  }
  
  // ВРЕМЕННО ОТКЛЮЧЕНО: Проверка доступа по тарифу (режим тестирования)
  // const userPlan = c.req.header("X-User-Plan") || "free"
  // const userTier: SynapseTier = planToTier(userPlan)
  
  // console.log(`[DEBUG] User tier check:`, {
  //   userPlan,
  //   userTier,
  //   tierHeader: c.req.header("X-User-Tier"),
  // })
  
  // Model mapping: только модели из тарифной сетки Synapse
  // Обновлено на основе реальных ID моделей от OpenRouter
  const MODEL_MAP: Record<string, string> = {
    // START tier (390 ₽) - исправлен ID модели
    "flux-schnell": "black-forest-labs/flux-1-schnell", // Правильный ID для OpenRouter
    
    // CREATOR tier (990 ₽)
    "dall-e-3": "openai/dall-e-3",
    "nana-banana": "google/gemini-2.0-flash-exp:free", // Nana Banana для CREATOR
    
    // PRO_STUDIO tier (2 990 ₽)
    "flux-pro": "black-forest-labs/flux-pro",
    
    // Альтернативные модели для тестирования (все открыты в режиме тестирования)
    "gemini-pro": "google/gemini-2.0-pro-exp-02-05:free", // Для тестирования лучших моделей
    "gpt-4o-latest": "openai/gpt-4o-2024-11-20", // Последняя версия GPT-4o
  }
  // Fallback на рабочий ID модели
  const openRouterModel = engine && MODEL_MAP[engine] ? MODEL_MAP[engine] : "black-forest-labs/flux-1-schnell"
  const replicateModel = "black-forest-labs/flux-schnell" // Для Replicate (использует другой формат)
  
  // ВРЕМЕННО ОТКЛЮЧЕНО: Проверка доступа к модели по тарифу
  // const requiredTier = getRequiredTierForImageModel(openRouterModel)
  // const accessCheck = checkTierAccess(userTier, requiredTier)
  
  console.log(`[DEBUG] Model selection (testing mode - no tier restrictions):`, {
    engine: engine || "default",
    openRouterModel,
    replicateModel,
    willUseReplicate: engine === "nana-banana" && !!replicateToken,
  })
  
  // ВРЕМЕННО ОТКЛЮЧЕНО: Блокировка доступа
  // if (!accessCheck.allowed) {
  //   console.warn(`[DEBUG] Image access denied:`, {
  //     userTier,
  //     requiredTier,
  //     model: openRouterModel,
  //     message: accessCheck.message,
  //   })
  //   return c.json({ 
  //     error: accessCheck.message || "Доступно только в PRO STUDIO",
  //     requiredTier,
  //     userTier,
  //   }, 403 as const)
  // }
  
  // Для nana-banana пробуем Replicate сначала
  if (engine === "nana-banana" && replicateToken) {
    try {
      console.log(`[DEBUG] Attempting Replicate for nana-banana`)
      const replicateUrl = "https://api.replicate.com/v1/predictions"
      const replicatePayload = {
        model: replicateModel,
        input: {
          prompt: enhancedPrompt,
          aspect_ratio: aspectRatio === "16:9" ? "16:9" : aspectRatio === "9:16" ? "9:16" : "1:1",
          output_format: "png",
        },
      }
      
      const replicateResponse = await fetch(replicateUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${replicateToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(replicatePayload),
      })
      
      console.log(`[DEBUG] Replicate response:`, {
        status: replicateResponse.status,
        ok: replicateResponse.ok,
      })
      
      if (replicateResponse.ok) {
        const prediction = await replicateResponse.json() as { id: string; status: string }
        console.log(`[DEBUG] Replicate prediction created:`, prediction.id)
        return c.json({
          id: prediction.id,
          status: prediction.status,
          provider: "replicate",
          engine: engine,
          prompt: prompt.trim(),
          aspectRatio,
          style: specializedEngine === "niji-v6" ? "nana-banana" : style,
          mode: mode || "text-to-image",
        }, 201 as const)
      }
    } catch (replicateError) {
      console.warn(`[DEBUG] Replicate failed, falling back to OpenRouter:`, replicateError)
    }
  }
  
  // OpenRouter fallback или основной путь
  console.log(`[DEBUG] Using OpenRouter with model:`, openRouterModel)
  
  // Проверка ключа перед использованием
  if (!openRouterKey || openRouterKey === "") {
    console.error(`[DEBUG] OPENROUTER_API_KEY is undefined or empty before fetch`)
    return c.json({ error: "API key is missing" }, 503 as const)
  }
  
  // Используем стандартный эндпоинт генерации изображений для Flux моделей
  const openRouterUrl = "https://openrouter.ai/api/v1/images/generations"
  
  console.log(`[DEBUG] Final URL for OpenRouter:`, openRouterUrl)
  console.log(`[DEBUG] OpenRouter API key check:`, {
    hasKey: !!openRouterKey,
    keyLength: openRouterKey.length,
    keyPreview: openRouterKey.substring(0, 8) + "...",
  })
  
  // Формат images/generations для генерации изображений
  const openRouterPayload = {
    model: openRouterModel,
    prompt: enhancedPrompt,
    response_format: "url",
  }
  
  console.log(`[DEBUG] Sending model ID:`, openRouterPayload.model)
  console.log(`[DEBUG] Payload:`, JSON.stringify(openRouterPayload, null, 2))
  
  // Обязательные заголовки для OpenRouter
  const openRouterHeaders = {
    "Authorization": `Bearer ${openRouterKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://synapse-7436.vercel.app",
    "X-Title": "Synapse AI Studio",
  }
  
  console.log(`[DEBUG] Headers sent:`, {
    hasAuthorization: !!openRouterHeaders.Authorization,
    authorizationPreview: openRouterHeaders.Authorization.substring(0, 20) + "...",
    httpReferer: openRouterHeaders["HTTP-Referer"],
    xTitle: openRouterHeaders["X-Title"],
    contentType: openRouterHeaders["Content-Type"],
  })
  
  const openRouterAbort = new AbortController()
  const openRouterTimeout = setTimeout(() => openRouterAbort.abort(), 8000)
  
  try {
    console.log(`[DEBUG] Sending fetch request to:`, openRouterUrl)
    
    const response = await fetch(openRouterUrl, {
      method: "POST",
      signal: openRouterAbort.signal,
      headers: openRouterHeaders,
      body: JSON.stringify(openRouterPayload),
    })
    
    console.log(`[DEBUG] OpenRouter response received:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
      elapsedTime: Date.now() - requestStartTime,
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      console.error(`[DEBUG] OpenRouter error:`, {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        responseUrl: response.url, // Проверка, не редирект ли это на Vercel
        errorPreview: errorText.substring(0, 500),
        isHtml: errorText.includes("<!DOCTYPE") || errorText.includes("<html"),
      })
      const statusCode = response.status >= 500 ? (500 as const) : (response.status >= 400 ? (response.status as 400 | 401 | 403 | 404 | 429) : (500 as const))
      return c.json({ error: "Failed to generate image. Please try again." }, statusCode)
    }
    
    // Формат ответа images/generations: data массив с объектами { url: string }
    const data = await response.json() as {
      data?: Array<{ url: string }>
      url?: string // Альтернативный формат с одним изображением
    }
    
    console.log(`[DEBUG] Parsed response data:`, {
      hasData: !!data.data,
      dataCount: data.data?.length || 0,
      hasUrl: !!data.url,
      fullResponse: JSON.stringify(data).substring(0, 500),
    })
    
    // Обработка формата с массивом data
    if (data.data && data.data.length > 0) {
      const images = data.data.map((img, idx) => ({
        id: `${Date.now()}-${idx}`,
        url: img.url,
        prompt: prompt.trim(),
        aspectRatio: aspectRatio || "1:1",
        style: specializedEngine === "niji-v6" ? "nana-banana" : style || "photorealistic",
        mode: mode || "text-to-image",
        createdAt: new Date().toISOString(),
        creditCost: (engine === "kandinsky-3.1" || engine === "flux-schnell" || !engine) ? 0 : 1,
      })).filter(img => img.url)
      
      console.log(`[DEBUG] Successfully generated ${images.length} images`)
      return c.json({ images, totalCreditCost: images.length }, 201 as const)
    }
    
    // Обработка формата с одним url
    if (data.url) {
      const images = [{
        id: `${Date.now()}-0`,
        url: data.url,
        prompt: prompt.trim(),
        aspectRatio: aspectRatio || "1:1",
        style: specializedEngine === "niji-v6" ? "nana-banana" : style || "photorealistic",
        mode: mode || "text-to-image",
        createdAt: new Date().toISOString(),
        creditCost: (engine === "kandinsky-3.1" || engine === "flux-schnell" || !engine) ? 0 : 1,
      }]
      
      console.log(`[DEBUG] Successfully generated 1 image`)
      return c.json({ images, totalCreditCost: images.length }, 201 as const)
    }
    
    console.error(`[DEBUG] No images found in response:`, JSON.stringify(data))
    return c.json({ error: "No images generated" }, 500 as const)
  } catch (fetchError) {
    console.error(`[DEBUG] Fetch error:`, fetchError)
    return c.json({ error: "Network error. Please try again." }, 503 as const)
  } finally {
    clearTimeout(openRouterTimeout)
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

// Fallback для несуществующих роутов
app.notFound((c) => {
  const url = new URL(c.req.url)
  const pathname = url.pathname
  console.error("[API] Route not found:", {
    path: pathname,
    method: c.req.method,
    url: c.req.url,
  });
  
  return c.json({ 
    error: `Route not found: ${pathname}`,
    method: c.req.method,
    url: c.req.url,
    availableRoutes: ['/api/ping', '/api/debug', '/api/chat', '/api/image', '/api/video', '/api/enhance', '/api/audio', '/api/avatar', '/api/webhook']
  }, 404);
});

export default app;

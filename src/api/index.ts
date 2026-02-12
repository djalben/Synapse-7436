// Переключаем с 'edge' на 'nodejs' и увеличиваем время (дублируем в api/index.ts для ясности)
export const runtime = 'nodejs';
export const maxDuration = 60; // Даем функции 60 секунд на работу

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

const FALLBACK_BASE = "https://synapse-7436.vercel.app"

/** Строит полный URL из запроса. Устойчиво к Hono/Node.js/Vercel (без c.req.header, через raw.headers). */
function getRequestUrl(c: { req: { url: string; raw: { headers: Headers | Record<string, string | string[] | undefined> } } }): URL {
  const raw = c.req.url
  if (raw.startsWith("http://") || raw.startsWith("https://")) return new URL(raw)
  const headers = c.req.raw.headers
  const host =
    (typeof (headers as Headers).get === "function"
      ? (headers as Headers).get?.("host")
      : (headers as Record<string, string | string[] | undefined>)["host"]) ?? null
  const hostStr = (Array.isArray(host) ? host[0] : host)?.trim() || ""
  const protocol =
    (typeof (headers as Headers).get === "function"
      ? (headers as Headers).get?.("x-forwarded-proto")
      : (headers as Record<string, string | string[] | undefined>)["x-forwarded-proto"]) ?? null
  const protocolStr = (Array.isArray(protocol) ? protocol[0] : protocol) || "https"
  const base =
    hostStr && hostStr !== "localhost" ? `${protocolStr}://${hostStr}` : FALLBACK_BASE
  return new URL(raw, base)
}

// basePath('/api') — все роуты доступны как /api/... (фронт должен слать /api/image без слеша в конце)
const app = new Hono().basePath('/api')

// Глобальное логирование всех входящих запросов
app.use('*', async (c, next) => {
  const url = getRequestUrl(c)
  console.log(`[DEBUG] ${c.req.method} ${url.pathname} (full URL: ${url.toString()})`)
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
  const url = getRequestUrl(c)
  return c.json({
    path: url.pathname,
    method: c.req.method,
    url: url.toString(),
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
  const requestStartTime = Date.now()
  console.log(`[DEBUG] Image generation request START at ${new Date().toISOString()} (elapsed 0ms)`)
  const requestUrl = getRequestUrl(c)
  console.log(`[DEBUG] Request URL:`, requestUrl.toString())
  console.log(`[DEBUG] Request path:`, requestUrl.pathname)
  console.log(`[DEBUG] POST /image handler called`)
  
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
    // START tier (390 ₽) - актуальные ID моделей 2026 года
    "flux-schnell": "black-forest-labs/flux.2-klein", // Быстро/дешево (2026)
    
    // CREATOR tier (990 ₽) — специализированная модель для генерации изображений
    "nana-banana": "google/gemini-3-pro-image-preview",
    
    // PRO_STUDIO tier (2 990 ₽)
    "flux-pro": "black-forest-labs/flux.2-pro", // Премиум (2026)
  }
  // АКТИВНАЯ МОДЕЛЬ: Gemini 3 Pro Image Preview для генерации изображений
  const modelToUse = "google/gemini-3-pro-image-preview"
  const openRouterModel = modelToUse
  const replicateModel = "black-forest-labs/flux-schnell" // Для Replicate (fallback)
  
  console.log(`[DEBUG] GEMINI 3 PRO IMAGE MODE: Using google/gemini-3-pro-image-preview`)
  
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
  
  // Полный URL OpenRouter (без относительных путей — исключает ошибки 550 / Invalid URL)
  const openRouterUrl = "https://openrouter.ai/api/v1/chat/completions"
  
  console.log(`[DEBUG] Final URL for OpenRouter (absolute):`, openRouterUrl)
  console.log(`[DEBUG] URL is absolute:`, openRouterUrl.startsWith("http"))
  console.log(`[DEBUG] OpenRouter API key check:`, {
    hasKey: !!openRouterKey,
    keyLength: openRouterKey.length,
    keyPreview: openRouterKey.substring(0, 8) + "...",
  })
  
  // Gemini 3 Pro Image Preview — специализированная модель, только ["image"]
  const isGemini3Image = openRouterModel.includes("gemini-3-pro-image-preview")
  const modalities: ("image" | "text")[] = isGemini3Image ? ["image"] : ["image"]
  
  console.log(`[DEBUG] Model: Gemini 3 Pro Image Preview, modalities:`, modalities)
  
  // Формат chat/completions для генерации изображений
  const openRouterPayload = {
    model: openRouterModel, // "google/gemini-3-pro-image-preview"
    messages: [
      {
        role: "user",
        content: enhancedPrompt,
      },
    ],
    modalities: modalities, // только изображение
  }
  
  console.log(`[DEBUG] GEMINI 3 PRO IMAGE REQUEST:`, {
    model: openRouterPayload.model,
    modalities: openRouterPayload.modalities,
    promptLength: enhancedPrompt.length,
    promptPreview: enhancedPrompt.substring(0, 200),
  })
  
  console.log(`[DEBUG] Final model ID sent to OpenRouter:`, openRouterPayload.model)
  console.log(`[DEBUG] Modalities:`, modalities)
  console.log(`[DEBUG] Full payload:`, JSON.stringify(openRouterPayload, null, 2))
  
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
  // Таймаут 60 секунд для тяжёлых моделей (Gemini 3 Pro Image и др.)
  const OPENROUTER_TIMEOUT_MS = 60000
  const openRouterTimeout = setTimeout(() => openRouterAbort.abort(), OPENROUTER_TIMEOUT_MS)
  console.log(`[DEBUG] OpenRouter fetch timeout set to ${OPENROUTER_TIMEOUT_MS / 1000}s`)
  
  try {
    const fullUrl = openRouterUrl
    console.log("[DEBUG] Final request URL:", fullUrl)
    console.log(`[DEBUG] Sending fetch request to:`, fullUrl)
    
    const response = await fetch(fullUrl, {
      method: "POST",
      signal: openRouterAbort.signal,
      headers: openRouterHeaders,
      body: JSON.stringify(openRouterPayload),
    })
    
    console.log(`[DEBUG] GEMINI 3 PRO IMAGE REQUEST (sending):`, {
      url: openRouterUrl,
      model: openRouterPayload.model,
      modalities: openRouterPayload.modalities,
      promptLength: enhancedPrompt.length,
      promptPreview: enhancedPrompt.substring(0, 200),
    })
    
    console.log(`[DEBUG] OpenRouter response received:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
      elapsedTime: Date.now() - requestStartTime,
      model: openRouterPayload.model,
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      const fullError = errorText.length > 2000 ? errorText.substring(0, 2000) + "..." : errorText
      
      // Детальное логирование для сопоставления с журналами OpenRouter
      console.error(`[DEBUG] OpenRouter error (FULL):`, {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        requestUrl: openRouterUrl,
        model: openRouterPayload.model,
        modalities: openRouterPayload.modalities,
        payload: JSON.stringify(openRouterPayload, null, 2),
        headers: JSON.stringify(openRouterHeaders, null, 2),
        fullErrorText: fullError,
        errorLength: errorText.length,
        isHtml: errorText.includes("<!DOCTYPE") || errorText.includes("<html"),
        timestamp: new Date().toISOString(),
      })
      
      // Выводим полную ошибку в консоль для сопоставления с OpenRouter журналами
      console.error(`[DEBUG] Full error response body:`, fullError)
      
      const elapsedError = Date.now() - requestStartTime
      console.log(`[DEBUG] Image generation request END (response not ok): elapsed ${elapsedError}ms (${(elapsedError / 1000).toFixed(1)}s), status ${response.status}`)
      
      const statusCode = response.status >= 500 ? (500 as const) : (response.status >= 400 ? (response.status as 400 | 401 | 403 | 404 | 429) : (500 as const))
      return c.json({ 
        error: "Failed to generate image. Please try again.",
        debug: {
          status: response.status,
          model: openRouterPayload.model,
          errorPreview: errorText.substring(0, 500),
        }
      }, statusCode)
    }
    
    // Формат ответа chat/completions: images в choices[0].message.images
    // OpenRouter может возвращать изображения как URL или base64
    const data = await response.json() as {
      choices?: Array<{
        message?: {
          images?: Array<{
            image_url?: { url: string; b64_json?: string }
            imageUrl?: { url: string; b64_json?: string }
            url?: string // Прямой URL
            b64_json?: string // Base64 изображение
          }>
        }
      }>
    }
    
    // Детальное логирование ответа от Gemini 3 Pro Image Preview
    console.log(`[DEBUG] GEMINI 3 PRO IMAGE RESPONSE:`, {
      model: openRouterPayload.model,
      modalities: openRouterPayload.modalities,
      hasChoices: !!data.choices,
      choicesCount: data.choices?.length || 0,
      hasImages: !!data.choices?.[0]?.message?.images,
      imagesCount: data.choices?.[0]?.message?.images?.length || 0,
      fullResponse: JSON.stringify(data, null, 2),
      responsePreview: JSON.stringify(data).substring(0, 1000),
    })
    
    console.log(`[DEBUG] GEMINI 3 PRO IMAGE FULL RESPONSE BODY:`, JSON.stringify(data, null, 2))
    
    const message = data.choices?.[0]?.message
    if (message?.images && message.images.length > 0) {
      const images = message.images.map((img, idx) => {
        // Поддержка разных форматов ответа от OpenRouter
        // 1. URL через image_url.url
        // 2. URL через imageUrl.url
        // 3. Прямой URL
        // 4. Base64 через image_url.b64_json или imageUrl.b64_json
        // 5. Прямой base64 через b64_json
        let imageUrl = img.image_url?.url || img.imageUrl?.url || img.url
        
        // Если есть base64, конвертируем в data URL для фронтенда
        const base64Data = img.image_url?.b64_json || img.imageUrl?.b64_json || img.b64_json
        if (base64Data && !imageUrl) {
          imageUrl = `data:image/png;base64,${base64Data}`
          console.log(`[DEBUG] Converted base64 to data URL for image ${idx}`)
        }
        
        return {
          id: `${Date.now()}-${idx}`,
          url: imageUrl,
          prompt: prompt.trim(),
          aspectRatio: aspectRatio || "1:1",
          style: specializedEngine === "niji-v6" ? "nana-banana" : style || "photorealistic",
          mode: mode || "text-to-image",
          createdAt: new Date().toISOString(),
          creditCost: (engine === "kandinsky-3.1" || engine === "flux-schnell" || !engine) ? 0 : 1,
        }
      }).filter(img => img.url)
      
      const elapsedMs = Date.now() - requestStartTime
      console.log(`[DEBUG] Image generation request END (success): generated ${images.length} images, elapsed ${elapsedMs}ms (${(elapsedMs / 1000).toFixed(1)}s)`)
      return c.json({ images, totalCreditCost: images.length }, 201 as const)
    }
    
    const elapsedNoImages = Date.now() - requestStartTime
    console.error(`[DEBUG] Image generation request END (no images): elapsed ${elapsedNoImages}ms (${(elapsedNoImages / 1000).toFixed(1)}s)`, JSON.stringify(data))
    return c.json({ error: "No images generated" }, 500 as const)
  } catch (fetchError) {
    const elapsedCatch = Date.now() - requestStartTime
    console.error(`[DEBUG] Image generation request END (fetch error): elapsed ${elapsedCatch}ms (${(elapsedCatch / 1000).toFixed(1)}s)`, fetchError)
    return c.json({ error: "Network error. Please try again." }, 503 as const)
  } finally {
    clearTimeout(openRouterTimeout)
    const totalElapsedMs = Date.now() - requestStartTime
    console.log(`[DEBUG] Image generation total elapsed: ${totalElapsedMs}ms (${(totalElapsedMs / 1000).toFixed(1)}s) — exiting handler`)
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
  const url = getRequestUrl(c)
  const pathname = url.pathname
  const fullUrl = url.toString()
  console.error("[API] Route not found:", {
    path: pathname,
    method: c.req.method,
    url: fullUrl,
  });
  
  return c.json({ 
    error: `Route not found: ${pathname}`,
    method: c.req.method,
    url: fullUrl,
    availableRoutes: ['/api/ping', '/api/debug', '/api/chat', '/api/image', '/api/video', '/api/enhance', '/api/audio', '/api/avatar', '/api/webhook']
  }, 404);
});

export default app;

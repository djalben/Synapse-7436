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

// basePath('/api') — все роуты доступны как /api/... (фронт должен слать /api/image без слеша в конце)
const app = new Hono().basePath('/api')

// Глобальное логирование всех входящих запросов (стандартные пути Hono)
app.use('*', async (c, next) => {
  console.log(`[DEBUG] ${c.req.method} ${c.req.path} (url: ${c.req.url})`)
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

// Прямой роут POST /api/image
app.post('/image', async (c) => {
  const requestStartTime = Date.now()
  console.log(`[DEBUG] POST /image ${c.req.path} at ${new Date().toISOString()}`)
  
  const runtimeEnv = getRuntimeEnv<Env>(c)
  // Ключ из Vercel env или process.env.AIMLAPI_KEY (Node.js)
  const aimlapiKey = runtimeEnv?.AIMLAPI_KEY ?? (typeof process !== "undefined" && process.env?.AIMLAPI_KEY)
  const replicateToken = runtimeEnv?.REPLICATE_API_TOKEN
  
  console.log(`[DEBUG] Environment check:`, { hasAimlapiKey: !!aimlapiKey, hasReplicateToken: !!replicateToken })
  
  if (!aimlapiKey) {
    console.error(`[DEBUG] AIMLAPI_KEY missing`)
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
  
  // Model mapping: модели AIMLAPI для генерации изображений
  const MODEL_MAP: Record<string, string> = {
    "flux-schnell": "flux/schnell", // Быстрая модель для фото
    "flux-pro": "flux/2-pro", // Премиум модель для фото
  }
  // Модель по умолчанию: flux/schnell (быстрая и дешёвая для тестов)
  const modelToUse = engine && MODEL_MAP[engine] ? MODEL_MAP[engine] : "flux/schnell"
  const aimlapiModel = modelToUse
  const replicateModel = "black-forest-labs/flux-schnell" // Replicate fallback
  
  console.log(`[DEBUG] AIMLAPI IMAGE: model=${aimlapiModel}`)
  
  // ВРЕМЕННО ОТКЛЮЧЕНО: Проверка доступа к модели по тарифу
  // const requiredTier = getRequiredTierForImageModel(aimlapiModel)
  // const accessCheck = checkTierAccess(userTier, requiredTier)
  
  console.log(`[DEBUG] Model selection (testing mode - no tier restrictions):`, {
    engine: engine || "default",
    aimlapiModel,
    replicateModel,
    willUseReplicate: engine === "nana-banana" && !!replicateToken,
  })
  
  // ВРЕМЕННО ОТКЛЮЧЕНО: Блокировка доступа
  // if (!accessCheck.allowed) {
  //   console.warn(`[DEBUG] Image access denied:`, {
  //     userTier,
  //     requiredTier,
  //     model: aimlapiModel,
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
      console.warn(`[DEBUG] Replicate failed, falling back to AIMLAPI:`, replicateError)
    }
  }
  
  // AIMLAPI — основной путь для генерации изображений
  if (!aimlapiKey || aimlapiKey === "") {
    console.error(`[DEBUG] AIMLAPI_KEY is undefined or empty before fetch`)
    return c.json({ error: "API key is missing" }, 503 as const)
  }
  
  // Базовый URL AIMLAPI (без относительных путей для Node.js)
  const aimlapiUrl = `${AIMLAPI_BASE_URL}/images/generations`
  
  console.log(`[DEBUG] Final URL for AIMLAPI (absolute):`, aimlapiUrl)
  console.log(`[DEBUG] AIMLAPI key check:`, { hasKey: !!aimlapiKey, keyPreview: aimlapiKey.substring(0, 8) + "..." })
  
  // Бесплатный тест: POST /images/generations, Authorization: Bearer AIMLAPI_KEY
  // Тело: { model: "flux/schnell", prompt, n: 1, size: "1024x1024" }. Ответ: OpenAI-формат, картинка в response.data[0].url
  const sizeStr = `${size.width}x${size.height}` // по умолчанию 1:1 → "1024x1024"
  const aimlapiPayload = {
    model: aimlapiModel, // по умолчанию flux/schnell — самая быстрая для теста
    prompt: enhancedPrompt,
    n: numImages || 1,
    size: sizeStr,
  }
  
  console.log(`[DEBUG] AIMLAPI IMAGE REQUEST:`, {
    model: aimlapiPayload.model,
    promptLength: enhancedPrompt.length,
    promptPreview: enhancedPrompt.substring(0, 200),
    size: aimlapiPayload.size,
    n: aimlapiPayload.n,
  })
  
  console.log(`[DEBUG] Final model ID sent to AIMLAPI:`, aimlapiPayload.model)
  console.log(`[DEBUG] Full payload:`, JSON.stringify(aimlapiPayload, null, 2))
  
  // Обязательные заголовки для AIMLAPI
  const aimlapiHeaders = {
    "Authorization": `Bearer ${aimlapiKey}`,
    "Content-Type": "application/json",
  }
  
  console.log(`[DEBUG] Headers sent:`, {
    hasAuthorization: !!aimlapiHeaders.Authorization,
    authorizationPreview: aimlapiHeaders.Authorization.substring(0, 20) + "...",
    contentType: aimlapiHeaders["Content-Type"],
  })
  
  const aimlapiAbort = new AbortController()
  // Таймаут 60 секунд для генерации изображений
  const AIMLAPI_TIMEOUT_MS = 60000
  const aimlapiTimeout = setTimeout(() => aimlapiAbort.abort(), AIMLAPI_TIMEOUT_MS)
  console.log(`[DEBUG] AIMLAPI fetch timeout set to ${AIMLAPI_TIMEOUT_MS / 1000}s`)
  
  try {
    const fullUrl = aimlapiUrl
    console.log("[DEBUG] Final request URL:", fullUrl)
    console.log(`[DEBUG] Sending fetch request to:`, fullUrl)
    
    const response = await fetch(fullUrl, {
      method: "POST",
      signal: aimlapiAbort.signal,
      headers: aimlapiHeaders,
      body: JSON.stringify(aimlapiPayload),
    })
    
    console.log(`[DEBUG] AIMLAPI IMAGE REQUEST (sending):`, {
      url: aimlapiUrl,
      model: aimlapiPayload.model,
      promptLength: enhancedPrompt.length,
      promptPreview: enhancedPrompt.substring(0, 200),
    })
    
    console.log(`[DEBUG] AIMLAPI response received:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url,
      elapsedTime: Date.now() - requestStartTime,
      model: aimlapiPayload.model,
    })
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      const fullError = errorText.length > 2000 ? errorText.substring(0, 2000) + "..." : errorText
      
      // Детальное логирование для сопоставления с журналами AIMLAPI
      console.error(`[DEBUG] AIMLAPI error (FULL):`, {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        requestUrl: aimlapiUrl,
        model: aimlapiPayload.model,
        payload: JSON.stringify(aimlapiPayload, null, 2),
        headers: JSON.stringify(aimlapiHeaders, null, 2),
        fullErrorText: fullError,
        errorLength: errorText.length,
        isHtml: errorText.includes("<!DOCTYPE") || errorText.includes("<html"),
        timestamp: new Date().toISOString(),
      })
      
      // Выводим полную ошибку в консоль для сопоставления с AIMLAPI журналами
      console.error(`[DEBUG] Full error response body:`, fullError)
      
      const elapsedError = Date.now() - requestStartTime
      console.log(`[DEBUG] Image generation request END (response not ok): elapsed ${elapsedError}ms (${(elapsedError / 1000).toFixed(1)}s), status ${response.status}`)
      
      const statusCode = response.status >= 500 ? (500 as const) : (response.status >= 400 ? (response.status as 400 | 401 | 403 | 404 | 429) : (500 as const))
      return c.json({ 
        error: "Failed to generate image. Please try again.",
        debug: {
          status: response.status,
          model: aimlapiPayload.model,
          errorPreview: errorText.substring(0, 500),
        }
      }, statusCode)
    }
    
    // AIMLAPI возвращает стандартный OpenAI-формат; путь к картинке: response.data[0].url
    const data = await response.json() as {
      data?: Array<{ url?: string; b64_json?: string }>
    }
    
    // Детальное логирование ответа от AIMLAPI
    console.log(`[DEBUG] AIMLAPI IMAGE RESPONSE:`, {
      model: aimlapiPayload.model,
      hasData: !!data.data,
      dataCount: data.data?.length || 0,
      fullResponse: JSON.stringify(data, null, 2),
      responsePreview: JSON.stringify(data).substring(0, 1000),
    })
    
    console.log(`[DEBUG] AIMLAPI FULL RESPONSE BODY:`, JSON.stringify(data, null, 2))
    
    // Извлекаем изображения из ответа AIMLAPI (формат data[].url или data[].b64_json)
    if (data.data && data.data.length > 0) {
      const images = data.data.map((img, idx) => {
        // Поддержка форматов ответа от AIMLAPI
        // 1. URL через url
        // 2. Base64 через b64_json
        let imageUrl = img.url
        
        // Если есть base64, конвертируем в data URL для фронтенда
        if (img.b64_json && !imageUrl) {
          imageUrl = `data:image/png;base64,${img.b64_json}`
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
    clearTimeout(aimlapiTimeout)
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

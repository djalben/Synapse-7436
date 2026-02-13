import { Hono } from "hono"
import { env as getRuntimeEnv } from "hono/adapter"

// Environment variables type for Hono context
type Env = {
  AIMLAPI_KEY?: string
  REPLICATE_API_TOKEN?: string
  VITE_BASE_URL?: string
}

export const imageRoutes = new Hono<{ Bindings: Env }>()

// Aspect ratio to size mapping for Flux model
const ASPECT_RATIO_MAP: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1344, height: 768 },
  "9:16": { width: 768, height: 1344 },
}

// Style prompt enhancements
const STYLE_PROMPTS: Record<string, string> = {
  photorealistic: ", photorealistic, 8k, ultra detailed, professional photography, sharp focus, realistic lighting",
  anime: ", anime style, manga art, vibrant colors, detailed anime illustration",
  "3d": ", 3D render, Pixar style, CGI, high quality 3D graphics, octane render, cinema 4D",
  cyberpunk: ", cyberpunk, neon lights, futuristic, blade runner aesthetic, dark sci-fi, neon city",
}

// Nana Banana (niji-v6) anime enhancement
const NANA_BANANA_PROMPT = ", anime masterpiece, niji style, vibrant colors, high quality anime art, detailed anime illustration, professional anime artwork, beautiful anime aesthetic"

// Model mapping from frontend engine IDs to AIMLAPI/Replicate model IDs
const MODEL_MAP: Record<string, string> = {
  "kandinsky-3.1": "flux/schnell", // Fallback to Flux for Kandinsky
  "flux-schnell": "flux/schnell", // AIMLAPI модель
  "flux-pro": "flux/2-pro", // AIMLAPI премиум модель
  "dall-e-3": "flux/schnell", // Fallback to Flux for DALL-E
  "midjourney-v7": "flux/schnell", // Fallback to Flux for Midjourney
  "nana-banana": "flux/schnell", // Using Flux with Nana Banana prompt enhancement
}

// Get Replicate prediction status (for frontend polling)
// Используем абсолютный URL для внешнего API
async function getReplicatePredictionStatus(predictionId: string, apiToken: string): Promise<{ status: string; output?: string | string[]; error?: string }> {
  const statusUrl = `https://api.replicate.com/v1/predictions/${predictionId}`
  console.log(`[FETCH START] URL: ${statusUrl} | Provider: replicate | Action: status-check`)
  
  const response = await fetch(statusUrl, {
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
  })
  
  if (!response.ok) {
    throw new Error("Failed to check prediction status")
  }
  
  return await response.json() as { status: string; output?: string | string[]; error?: string }
}

// GET /api/image — проверка доступности; генерация — POST /api/image
imageRoutes.get("/", (c) => {
  console.log(`[Image Routes] GET ${c.req.path} method=${c.req.method}`)
  return c.json({ ok: true, message: "Image API. Use POST to generate images." })
})

imageRoutes.post("/", async (c) => {
  console.log(`[Image Routes] POST ${c.req.path} method=${c.req.method} url=${c.req.url}`)
  
  // Declare variables outside try block for use in catch block
  let engine: string | undefined = undefined
  let mode: string | undefined = undefined
  
  // Log request start time for timeout tracking
  const requestStartTime = Date.now()
  
  // Валидация метода запроса
  if (c.req.method !== "POST") {
    console.error(`[Image API] Invalid method: ${c.req.method}, expected POST`)
    return c.json({ error: `Method ${c.req.method} not allowed. Use POST.` }, 405)
  }
  
  // c.env may be undefined on Vercel Edge; use hono/adapter env() then process.env
  let aimlapiKey: string | undefined
  let replicateToken: string | undefined
  try {
    const bindings = c.env as Env | undefined
    const runtimeEnv = getRuntimeEnv<Env>(c)
    aimlapiKey = bindings?.AIMLAPI_KEY ?? runtimeEnv?.AIMLAPI_KEY ?? (typeof process !== "undefined" && process.env?.AIMLAPI_KEY)
    replicateToken = bindings?.REPLICATE_API_TOKEN ?? runtimeEnv?.REPLICATE_API_TOKEN ?? (typeof process !== "undefined" && process.env?.REPLICATE_API_TOKEN)
    if (aimlapiKey === undefined || aimlapiKey === "") {
      const debugEnvKeys = typeof process !== "undefined" && process.env ? Object.keys(process.env) : []
      console.error("[Image API] AIMLAPI_KEY missing after c.env and process.env fallback. process.env keys:", debugEnvKeys.length)
      return c.json({
        error: "Error: Key AIMLAPI_KEY is missing.",
        debug_env_keys: debugEnvKeys,
      }, 503)
    }
    if (replicateToken === undefined || replicateToken === "") {
      console.warn("[Image API] REPLICATE_API_TOKEN is missing — Replicate path will be skipped")
    }
  } catch (envErr) {
    const debugEnvKeys = typeof process !== "undefined" && process.env ? Object.keys(process.env) : []
    console.error("[Image API] Failed to read env:", envErr)
    return c.json({
      error: "Error: Failed to read env (Key AIMLAPI_KEY or REPLICATE_API_TOKEN).",
      debug_env_keys: debugEnvKeys,
    }, 503)
  }
  
  try {
    console.log("[Image API] Request received:", {
      path: c.req.path,
      method: c.req.method,
      url: c.req.url,
      startTime: new Date(requestStartTime).toISOString(),
    });
    
    console.log("[Image API] Environment check:", {
      hasAimlapiKey: !!aimlapiKey,
      aimlapiKeyPreview: aimlapiKey ? `${aimlapiKey.substring(0, 4)}...` : "missing",
      hasReplicateToken: !!replicateToken,
      replicateTokenPreview: replicateToken ? `${replicateToken.substring(0, 4)}...` : "missing",
    });
    
    // Парсинг тела запроса с обработкой ошибок
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
      console.log("[Image API] Request body parsed successfully:", {
        hasPrompt: !!body.prompt,
        engine: body.engine || "not specified",
        mode: body.mode || "not specified",
        bodyKeys: Object.keys(body),
      })
    } catch (jsonError) {
      console.error("[Image API] Failed to parse request body:", jsonError)
      return c.json({ 
        error: "Invalid JSON in request body",
        debug_error: jsonError instanceof Error ? jsonError.message : String(jsonError)
      }, 400)
    }
    
    const { prompt, aspectRatio, numImages, style, referenceImage, specializedEngine } = body
    // Assign to outer scope variables
    engine = body.engine
    mode = body.mode
    
    console.log("[Image API] Request body:", {
      engine: engine || "not specified",
      specializedEngine: specializedEngine || "not specified",
      mode: mode || "text-to-image",
      hasPrompt: !!prompt,
      promptLength: prompt?.length || 0,
      aspectRatio: aspectRatio || "not specified",
      numImages: numImages || 1,
      style: style || "not specified",
      hasReferenceImage: !!referenceImage,
    });

    // Validate prompt
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Please enter a prompt to generate an image." }, 400)
    }

    // Validate image-to-image mode has a reference image
    if (mode === "image-to-image" && !referenceImage) {
      return c.json({ error: "Please upload a reference image for Image-to-Image mode." }, 400)
    }

    // Get size from aspect ratio
    const size = ASPECT_RATIO_MAP[aspectRatio] || ASPECT_RATIO_MAP["1:1"]

    // Build enhanced prompt based on style or specialized engine
    let enhancedPrompt = prompt.trim()

    // Check if Nana Banana (niji-v6) specialized engine is active
    if (specializedEngine === "niji-v6") {
      // Nana Banana mode - premium anime engine
      enhancedPrompt += NANA_BANANA_PROMPT
    } else if (style && STYLE_PROMPTS[style]) {
      // Standard style enhancement
      enhancedPrompt += STYLE_PROMPTS[style]
    }

    // For image-to-image mode, add transformation context
    if (mode === "image-to-image") {
      enhancedPrompt = `Transform the reference image: ${enhancedPrompt}. Maintain the core subject while applying the transformation.`
    }

    // Generate images (flux-1-schnell generates one image per request)
    const numToGenerate = Math.min(Math.max(numImages || 1, 1), 4)
    const generatedImages = []

    for (let i = 0; i < numToGenerate; i++) {
      // For image-to-image mode, use Replicate or fallback to text-to-image
      // For text-to-image, use AIMLAPI flux/schnell or flux/2-pro
      if (mode === "image-to-image" && referenceImage) {
        // Image-to-image через Replicate (если доступен) или fallback на text-to-image
        if (replicateToken) {
          try {
            const replicateModel = "black-forest-labs/flux-schnell"
            const replicateUrl = "https://api.replicate.com/v1/predictions"
            
            const replicatePayload = {
              model: replicateModel,
              input: {
                prompt: enhancedPrompt,
                image: referenceImage,
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
            
            if (replicateResponse.ok) {
              const prediction = await replicateResponse.json() as { id: string; status: string }
              return c.json({
                id: prediction.id,
                status: prediction.status,
                provider: "replicate",
                engine: engine,
                prompt: prompt.trim(),
                aspectRatio,
                style: specializedEngine === "niji-v6" ? "nana-banana" : style,
                mode: mode || "image-to-image",
              }, 201)
            }
          } catch (replicateError) {
            console.warn("[Image API] Replicate image-to-image failed, falling back to text-to-image:", replicateError)
          }
        }
        // Fallback: используем text-to-image с улучшенным промптом
        enhancedPrompt = `Transform this image: ${enhancedPrompt}. ${enhancedPrompt}`
      }
      
      {
        // Text-to-image: Select model based on engine parameter (AIMLAPI)
        const modelId = engine && MODEL_MAP[engine] ? MODEL_MAP[engine] : "flux/schnell"
        
        console.log("[Image API] Using model:", {
          requestedEngine: engine || "default",
          selectedModel: modelId,
          prompt: enhancedPrompt.substring(0, 100) + "...",
          elapsedTime: Date.now() - requestStartTime,
        });
        
        // For Nana Banana, try Replicate first if available (returns prediction ID for frontend polling)
        if (engine === "nana-banana" && replicateToken) {
          try {
            console.log("[Image API] Creating Replicate prediction for Nana Banana")
            
            const replicateModel = "black-forest-labs/flux-schnell"
            const replicateUrl = "https://api.replicate.com/v1/predictions"
            
            console.log(`[FETCH START] URL: ${replicateUrl} | Model: ${replicateModel} | Provider: replicate | Engine: ${engine}`)
            
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
            
            if (replicateResponse.ok) {
              const prediction = await replicateResponse.json() as { id: string; status: string }
              return c.json({
                id: prediction.id,
                status: prediction.status,
                provider: "replicate",
                engine: engine,
                prompt: prompt.trim(),
                aspectRatio,
                style: specializedEngine === "niji-v6" ? "nana-banana" : style,
                mode: mode || "text-to-image",
              }, 201)
            }
          } catch (replicateError) {
            console.error("[Image API] Replicate request failed:", replicateError)
            // Fall through to AIMLAPI
          }
        }
        
        // Use AIMLAPI for image generation; 60s timeout for image generation
        const aimlapiUrl = "https://api.aimlapi.com/v1/images/generations" // AIMLAPI base
        console.log(`[FETCH START] URL: ${aimlapiUrl} | Model: ${modelId} | Provider: aimlapi | Engine: ${engine || "default"}`)
        
        const aimlapiAbort = new AbortController()
        const aimlapiTimeout = setTimeout(() => aimlapiAbort.abort(), 60000)
        let response: Response
        const aimlapiPayload = {
          model: modelId, // AIMLAPI model format: "flux/schnell" or "flux/2-pro"
          prompt: enhancedPrompt,
          n: 1,
          size: `${size.width}x${size.height}`,
        }
        console.log("[Image API] AIMLAPI payload:", {
          model: aimlapiPayload.model,
          promptLength: aimlapiPayload.prompt.length,
          size: aimlapiPayload.size,
        })
        
        try {
          response = await fetch(aimlapiUrl, {
            method: "POST",
            signal: aimlapiAbort.signal,
            headers: {
              "Authorization": `Bearer ${aimlapiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(aimlapiPayload),
          })
          
          console.log("[Image API] AIMLAPI response:", {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries()),
          })
        } finally {
          clearTimeout(aimlapiTimeout)
        }

        if (!response.ok) {
          const status = response.status
          
          if (generatedImages.length > 0) break
          
          const errorText = await response.text().catch(() => "Unknown error")
          console.error("[Image API] Text-to-image error:", {
            status,
            statusText: response.statusText,
            model: modelId,
            engine: engine || "not specified",
            errorPreview: errorText.substring(0, 500),
          })
          
          let errorMessage = "Failed to generate image. Please try again."
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error?.message || errorJson.error || errorMessage
          } catch {
            if (errorText && !errorText.includes("<!DOCTYPE")) {
              errorMessage = errorText.substring(0, 200)
            }
          }
          
          if (status === 429) {
            return c.json({ error: "High demand right now. Please wait a moment and try again." }, 429)
          }
          if (status === 402 || status === 403) {
            return c.json({ error: "High load on GPU servers, please try again later." }, 500)
          }
          if (status === 401) {
            return c.json({ error: "Image generation service is not available. Please check API configuration." }, 503)
          }
          
          const httpStatus = status >= 500 ? 500 : (status >= 400 ? status : 500)
          return c.json({ error: errorMessage }, httpStatus as 400 | 401 | 403 | 429 | 500 | 503)
        }

        const data = await response.json() as {
          data?: Array<{
            url?: string
            b64_json?: string
          }>
        }

        // Extract image URL from the response
        if (data.data && data.data.length > 0) {
          const isFreeEngine = engine === "kandinsky-3.1" || engine === "flux-schnell" || !engine
          const creditCost = isFreeEngine ? 0 : 1
          for (const image of data.data) {
            const imageUrl = image.url || (image.b64_json ? `data:image/png;base64,${image.b64_json}` : null)
            if (imageUrl) {
              generatedImages.push({
                id: `${Date.now()}-${generatedImages.length}`,
                url: imageUrl,
                prompt: prompt.trim(),
                aspectRatio,
                style: specializedEngine === "niji-v6" ? "nana-banana" : style,
                mode: mode || "text-to-image",
                createdAt: new Date().toISOString(),
                creditCost,
              })
            }
          }
        }
      }
    }

    if (generatedImages.length === 0) {
      return c.json({ error: "Unable to generate images at this time. Please try a different prompt or try again later." }, 500)
    }

    return c.json({ 
      images: generatedImages,
      totalCreditCost: generatedImages.length,
    })
  } catch (error) {
    const elapsedTime = Date.now() - requestStartTime
    const elapsedTimeSeconds = Math.round((elapsedTime / 1000) * 100) / 100
    const err = error as Error & { code?: string; cause?: unknown }
    const errorMessage = err?.message ?? String(error)
    const errorStack = err?.stack ?? "no stack"
    
    try {
      const serialized = JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
      console.error("[Image API] Full Error Details:", serialized)
    } catch {
      console.error("[Image API] Full Error Details (fallback):", { message: errorMessage, name: err?.name })
    }
    console.error("[Image API] Stack trace:", errorStack)
    console.error("[Image API] Unexpected error context:", {
      error: errorMessage,
      engine: engine ?? "not specified",
      mode: mode ?? "text-to-image",
      elapsedTimeMs: elapsedTime,
      elapsedTimeSeconds,
    })
    
    // Temporary debug response: expose real error in browser
    const debugPayload = {
      debug_error: errorMessage,
      stack: errorStack,
      time: elapsedTimeSeconds,
    } as { debug_error: string; stack: string; time: number; error?: string }
    
    if (elapsedTime >= 9500) {
      debugPayload.error = "Vercel 10s Limit Exceeded"
      return c.json(debugPayload, 503)
    }
    
    return c.json(debugPayload, 503)
  }
})

// GET /api/image/status/:id — single status check (equivalent to replicate.predictions.get(id))
// Used by frontend polling; no server-side waiting, stays within Vercel 10s limit.
imageRoutes.get("/status/:id", async (c) => {
  try {
    const predictionId = c.req.param("id")
    const bindings = c.env as Env | undefined
    const runtimeEnv = getRuntimeEnv<Env>(c)
    const replicateToken = bindings?.REPLICATE_API_TOKEN ?? runtimeEnv?.REPLICATE_API_TOKEN ?? (typeof process !== "undefined" && process.env?.REPLICATE_API_TOKEN)
    if (replicateToken === undefined || replicateToken === "") {
      const debugEnvKeys = typeof process !== "undefined" && process.env ? Object.keys(process.env) : []
      return c.json({
        error: "Error: Key REPLICATE_API_TOKEN is missing.",
        debug_env_keys: debugEnvKeys,
      }, 503)
    }
    
    if (!predictionId) {
      return c.json({ error: "Prediction ID is required" }, 400)
    }
    
    // Single GET to Replicate — no polling on server
    const prediction = await getReplicatePredictionStatus(predictionId, replicateToken)
    
    return c.json({
      id: predictionId,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[Image API] Status check error:", errorMessage)
    return c.json({ error: errorMessage }, 500)
  }
})

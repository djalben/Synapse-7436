import { Hono } from "hono"
import { env as getRuntimeEnv } from "hono/adapter"

// Environment variables type for Hono context
type Env = {
  OPENROUTER_API_KEY?: string
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

// Model mapping from frontend engine IDs to OpenRouter/Replicate model IDs
const MODEL_MAP: Record<string, string> = {
  "kandinsky-3.1": "black-forest-labs/flux-1-schnell", // Fallback to Flux for Kandinsky
  "flux-schnell": "black-forest-labs/flux-1-schnell",
  "dall-e-3": "openai/dall-e-3",
  "midjourney-v7": "black-forest-labs/flux-1-schnell", // Fallback to Flux for Midjourney
  "nana-banana": "black-forest-labs/flux-1-schnell", // Using Flux with Nana Banana prompt enhancement
}

// Get Replicate prediction status (for frontend polling)
// Используем абсолютный URL для внешнего API
async function getReplicatePredictionStatus(predictionId: string, apiToken: string): Promise<{ status: string; output?: string | string[]; error?: string }> {
  const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
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

// GET /api/image — проверка доступности роута; генерация — POST /api/image (без слеша в конце)
imageRoutes.get("/", (c) => {
  const url = new URL(c.req.url)
  console.log(`[Image Routes] GET / called - pathname: ${url.pathname}, method: ${c.req.method}`)
  return c.json({ ok: true, message: "Image API. Use POST to generate images." })
})

imageRoutes.post("/", async (c) => {
  const url = new URL(c.req.url)
  console.log(`[Image Routes] POST / called - pathname: ${url.pathname}, method: ${c.req.method}, full URL: ${c.req.url}`)
  
  // Declare variables outside try block for use in catch block
  let engine: string | undefined = undefined
  let mode: string | undefined = undefined
  
  // Log request start time for timeout tracking
  const requestStartTime = Date.now()
  
  // c.env may be undefined on Vercel Edge; use hono/adapter env() then process.env
  let openRouterKey: string | undefined
  let replicateToken: string | undefined
  try {
    const bindings = c.env as Env | undefined
    const runtimeEnv = getRuntimeEnv<Env>(c)
    openRouterKey = bindings?.OPENROUTER_API_KEY ?? runtimeEnv?.OPENROUTER_API_KEY ?? (typeof process !== "undefined" && process.env?.OPENROUTER_API_KEY)
    replicateToken = bindings?.REPLICATE_API_TOKEN ?? runtimeEnv?.REPLICATE_API_TOKEN ?? (typeof process !== "undefined" && process.env?.REPLICATE_API_TOKEN)
    if (openRouterKey === undefined || openRouterKey === "") {
      const debugEnvKeys = typeof process !== "undefined" && process.env ? Object.keys(process.env) : []
      console.error("[Image API] OPENROUTER_API_KEY missing after c.env and process.env fallback. process.env keys:", debugEnvKeys.length)
      return c.json({
        error: "Error: Key OPENROUTER_API_KEY is missing.",
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
      error: "Error: Failed to read env (Key OPENROUTER_API_KEY or REPLICATE_API_TOKEN).",
      debug_env_keys: debugEnvKeys,
    }, 503)
  }
  
  try {
    // Логирование для отладки маршрутизации
    const url = new URL(c.req.url)
    console.log("[Image API] Request received:", {
      path: url.pathname,
      method: c.req.method,
      url: c.req.url,
      startTime: new Date(requestStartTime).toISOString(),
    });
    
    console.log("[Image API] Environment check:", {
      hasOpenRouterKey: !!openRouterKey,
      openRouterKeyPreview: openRouterKey ? `${openRouterKey.substring(0, 4)}...` : "missing",
      hasReplicateToken: !!replicateToken,
      replicateTokenPreview: replicateToken ? `${replicateToken.substring(0, 4)}...` : "missing",
    });
    
    const body = await c.req.json() as {
      prompt?: string
      aspectRatio?: string
      numImages?: number
      style?: string
      mode?: string
      referenceImage?: string
      specializedEngine?: string
      engine?: string
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
      // For image-to-image mode, use a multimodal model
      // For text-to-image, use flux-1-schnell
      if (mode === "image-to-image" && referenceImage) {
        // OpenRouter image-to-image; 8s client timeout to avoid Vercel 10s limit
        // Используем абсолютный URL для внешнего API OpenRouter
        const imageToImageAbort = new AbortController()
        const imageToImageTimeout = setTimeout(() => imageToImageAbort.abort(), 8000)
        let response: Response
        try {
          response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            signal: imageToImageAbort.signal,
            headers: {
              "Authorization": `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://synapse-7436.vercel.app",
              "X-Title": "Synapse AI",
            },
            body: JSON.stringify({
              model: "google/gemini-2.0-flash-exp:free",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "image_url",
                      image_url: {
                        url: referenceImage,
                      },
                    },
                    {
                      type: "text",
                      text: `Generate a new image based on this reference: ${enhancedPrompt}`,
                    },
                  ],
                },
              ],
              modalities: ["image", "text"],
              stream: false,
            }),
          })
        } finally {
          clearTimeout(imageToImageTimeout)
        }

        if (!response.ok) {
          if (generatedImages.length > 0) break
          const errorText = await response.text().catch(() => "Unknown error")
          console.error("[Image API] Image-to-image error:", response.status, errorText)
          return c.json({ error: "Image transformation is experiencing high demand. Please try again later." }, 500)
        }

        const data = await response.json() as {
          choices?: Array<{
            message?: {
              images?: Array<{
                image_url?: { url: string }
                imageUrl?: { url: string }
              }>
            }
          }>
        }
        const message = data.choices?.[0]?.message
        
        if (message?.images && message.images.length > 0) {
          for (const image of message.images) {
            const imageUrl = image.image_url?.url || image.imageUrl?.url
            if (imageUrl) {
              generatedImages.push({
                id: `${Date.now()}-${generatedImages.length}`,
                url: imageUrl,
                prompt: prompt.trim(),
                aspectRatio,
                style: specializedEngine === "niji-v6" ? "nana-banana" : style,
                mode: mode || "text-to-image",
                createdAt: new Date().toISOString(),
                creditCost: 3, // Image generation costs 3 credits
              })
            }
          }
        }
      } else {
        // Text-to-image: Select model based on engine parameter
        const modelId = engine && MODEL_MAP[engine] ? MODEL_MAP[engine] : "black-forest-labs/flux-1-schnell"
        
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
            
            // Create prediction in Replicate - используем абсолютный URL для внешнего API
            const replicateResponse = await fetch("https://api.replicate.com/v1/predictions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${replicateToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "black-forest-labs/flux-1-schnell", // Use Flux model via Replicate
                input: {
                  prompt: enhancedPrompt,
                  aspect_ratio: aspectRatio === "16:9" ? "16:9" : aspectRatio === "9:16" ? "9:16" : "1:1",
                  output_format: "png",
                },
              }),
            })
            
            if (replicateResponse.ok) {
              const prediction = await replicateResponse.json() as { id: string; status: string }
              console.log("[Image API] Replicate prediction created:", prediction.id, "status:", prediction.status)
              
              // Return prediction ID immediately for frontend polling (no waiting)
              // Frontend will poll /api/image/status/:id to get the result
              return c.json({
                id: prediction.id,
                status: prediction.status,
                provider: "replicate",
                engine: engine,
                prompt: prompt.trim(),
                aspectRatio,
                style: specializedEngine === "niji-v6" ? "nana-banana" : style,
                mode: mode || "text-to-image",
              })
            }
          } catch (replicateError) {
            console.warn("[Image API] Replicate failed, falling back to OpenRouter:", replicateError instanceof Error ? replicateError.message : String(replicateError))
            // Fall through to OpenRouter
          }
        }
        
        // Use OpenRouter for other models or as fallback; 8s client timeout to avoid Vercel 10s limit
        // Используем абсолютный URL для внешнего API OpenRouter
        const openRouterAbort = new AbortController()
        const openRouterTimeout = setTimeout(() => openRouterAbort.abort(), 8000)
        let response: Response
        try {
          response = await fetch("https://openrouter.ai/api/v1/images/generations", {
            method: "POST",
            signal: openRouterAbort.signal,
            headers: {
              "Authorization": `Bearer ${openRouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://synapse-7436.vercel.app",
              "X-Title": "Synapse AI",
            },
            body: JSON.stringify({
              model: modelId,
              prompt: enhancedPrompt,
              n: 1,
              size: `${size.width}x${size.height}`,
            }),
          })
        } finally {
          clearTimeout(openRouterTimeout)
        }

        if (!response.ok) {
          // Handle specific error cases with user-friendly messages
          const status = response.status
          
          if (generatedImages.length > 0) break
          
          // Логируем детали ошибки для отладки
          const errorText = await response.text().catch(() => "Unknown error")
          console.error("[Image API] Text-to-image error:", {
            status,
            statusText: response.statusText,
            model: modelId,
            engine: engine || "not specified",
            errorPreview: errorText.substring(0, 500),
          })
          
          // Try to parse error as JSON for more details
          let errorMessage = "Failed to generate image. Please try again."
          try {
            const errorJson = JSON.parse(errorText)
            errorMessage = errorJson.error?.message || errorJson.error || errorMessage
          } catch {
            // If not JSON, use the text or default message
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
          
          // Ensure status is a valid HTTP status code
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
        // Format: data[0].url or data[0].b64_json
        if (data.data && data.data.length > 0) {
          // Бесплатные движки: Kandinsky 3.1, Flux.1 [schnell] — 0 кредитов
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

import { Hono } from "hono"

export const imageRoutes = new Hono()

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const TIMEOUT_MS = 45000 // 45s — safely under Vercel's 60s limit

// Model routing by engine ID
const ENGINE_MODELS: Record<string, string> = {
  "flux-schnell": "black-forest-labs/flux.2-klein-4b",      // Free, fast
  "nana-banana": "google/imagen-3",                          // Imagen 3, fast + quality
  "flux-pro": "black-forest-labs/flux-1-dev",                // Flux.1 dev, high quality
}
const DEFAULT_MODEL = "black-forest-labs/flux.2-klein-4b"

// Style prompt enhancements
const STYLE_PROMPTS: Record<string, string> = {
  photorealistic: ", photorealistic, 8k, ultra detailed, professional photography, sharp focus, realistic lighting",
  anime: ", anime style, manga art, vibrant colors, detailed anime illustration",
  "3d": ", 3D render, Pixar style, CGI, high quality 3D graphics, octane render, cinema 4D",
  cyberpunk: ", cyberpunk, neon lights, futuristic, blade runner aesthetic, dark sci-fi, neon city",
}

const VALID_ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]

/** Promise.race timeout — bulletproof, works even if AbortController doesn't */
function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  return Promise.race([
    fetch(url, init),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT_${ms}ms`)), ms)
    ),
  ])
}

// GET /image — health check
imageRoutes.get("/", (c) => {
  return c.json({ ok: true, models: Object.keys(ENGINE_MODELS), timeout: TIMEOUT_MS })
})

// GET /image/test — diagnostic: fire a minimal request to OpenRouter and report raw result
imageRoutes.get("/test", async (c) => {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return c.json({ error: "OPENROUTER_API_KEY missing" }, 503)

  const t0 = Date.now()
  console.log("[Image/test] Starting diagnostic call...")

  const requestBody = {
    model: DEFAULT_MODEL,
    messages: [{ role: "user", content: "A red circle on white background" }],
    modalities: ["image"],
    stream: false,
  }
  console.log("[Image/test] Request body:", JSON.stringify(requestBody))

  try {
    const res = await fetchWithTimeout(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://synapse.app",
        "X-Title": "Synapse",
      },
      body: JSON.stringify(requestBody),
    }, TIMEOUT_MS)

    const elapsed = Date.now() - t0
    console.log(`[Image/test] Response status=${res.status}, elapsed=${elapsed}ms`)

    const text = await res.text()
    console.log(`[Image/test] Response body (first 500): ${text.substring(0, 500)}`)

    return c.json({
      status: res.status,
      elapsed,
      bodyPreview: text.substring(0, 1000),
      headers: Object.fromEntries(res.headers.entries()),
    })
  } catch (err) {
    const elapsed = Date.now() - t0
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Image/test] Error after ${elapsed}ms:`, msg)
    return c.json({ error: msg, elapsed }, 500)
  }
})

// POST /image — generate image via OpenRouter
imageRoutes.post("/", async (c) => {
  const startTime = Date.now()
  console.log(`[Image] POST start`)

  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.error("[Image] OPENROUTER_API_KEY missing")
      return c.json({ error: "Image generation service is not available." }, 503)
    }

    let body: {
      prompt?: string; aspectRatio?: string; numImages?: number;
      style?: string; mode?: string; engine?: string; specializedEngine?: string;
      referenceImage?: string;
    }
    try {
      body = await c.req.json() as typeof body
    } catch {
      return c.json({ error: "Invalid JSON in request body" }, 400)
    }

    const prompt = body.prompt?.trim()
    if (!prompt) {
      return c.json({ error: "Please enter a prompt to generate an image." }, 400)
    }

    let enhancedPrompt = prompt
    if (body.style && STYLE_PROMPTS[body.style]) {
      enhancedPrompt += STYLE_PROMPTS[body.style]
    }

    const aspectRatio = VALID_ASPECT_RATIOS.includes(body.aspectRatio || "") ? body.aspectRatio! : "1:1"
    const numToGenerate = Math.min(Math.max(body.numImages || 1, 1), 4)

    const selectedModel = ENGINE_MODELS[body.engine || ""] || DEFAULT_MODEL
    console.log(`[Image] model=${selectedModel}, engine=${body.engine}, ar=${aspectRatio}, n=${numToGenerate}, prompt="${enhancedPrompt.substring(0, 60)}"`)

    const generatedImages: Array<{
      id: string; url: string; prompt: string; aspectRatio: string;
      style: string; mode: string; createdAt: string; creditCost: number;
    }> = []

    for (let i = 0; i < numToGenerate; i++) {
      const loopStart = Date.now()
      console.log(`[Image] Requesting image ${i + 1}/${numToGenerate}...`)

      try {
        const requestBody = {
          model: selectedModel,
          messages: [{ role: "user", content: enhancedPrompt }],
          modalities: ["image"],
          stream: false,
          image_config: { aspect_ratio: aspectRatio },
        }

        const response = await fetchWithTimeout(OPENROUTER_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.VITE_BASE_URL || "https://synapse.app",
            "X-Title": "Synapse",
          },
          body: JSON.stringify(requestBody),
        }, TIMEOUT_MS)

        console.log(`[Image] Response ${i + 1}: status=${response.status}, elapsed=${Date.now() - loopStart}ms`)

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error")
          console.error(`[Image] Error ${response.status}: ${errorText.slice(0, 300)}`)
          if (generatedImages.length > 0) break
          if (response.status === 429) return c.json({ error: "High demand. Please wait and try again." }, 429)
          if (response.status === 402 || response.status === 403) return c.json({ error: "Insufficient credits or access denied." }, 500)
          return c.json({ error: `Image generation failed (${response.status}). Try again.` }, 500)
        }

        const rawText = await response.text()
        console.log(`[Image] Raw response length: ${rawText.length}, preview: ${rawText.substring(0, 200)}`)

        const data = JSON.parse(rawText) as {
          choices?: Array<{
            message?: {
              content?: string;
              images?: Array<{ type?: string; image_url?: { url?: string } }>;
            };
          }>;
        }

        if (data.choices && data.choices.length > 0) {
          const msg = data.choices[0]?.message
          const images = msg?.images
          console.log(`[Image] choices[0].message keys: ${msg ? Object.keys(msg).join(',') : 'null'}, images count: ${images?.length ?? 0}`)

          if (images) {
            for (const image of images) {
              const imageUrl = image.image_url?.url
              if (imageUrl) {
                generatedImages.push({
                  id: `${Date.now()}-${generatedImages.length}`,
                  url: imageUrl,
                  prompt, aspectRatio,
                  style: body.style || "photorealistic",
                  mode: body.mode || "text-to-image",
                  createdAt: new Date().toISOString(),
                  creditCost: 1,
                })
              }
            }
          }
        }
      } catch (fetchErr) {
        const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
        const isTimeout = msg.startsWith('TIMEOUT_')
        console.error(`[Image] Fetch error (${isTimeout ? 'timeout' : 'network'}) after ${Date.now() - loopStart}ms: ${msg}`)
        if (generatedImages.length > 0) break
        return c.json({
          error: isTimeout ? "Image generation timed out. Please try again with a simpler prompt." : "Network error. Please try again.",
        }, 503)
      }
    }

    if (generatedImages.length === 0) {
      return c.json({ error: "No images were generated. Try a different prompt." }, 500)
    }

    console.log(`[Image] Done: ${generatedImages.length} images, total=${Date.now() - startTime}ms`)
    return c.json({ images: generatedImages, totalCreditCost: generatedImages.length }, 201)
  } catch (error) {
    console.error(`[Image] Unexpected error after ${Date.now() - startTime}ms:`, error)
    return c.json({ error: "Internal error. Please try again." }, 500)
  }
})

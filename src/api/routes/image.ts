import { Hono } from "hono"

export const imageRoutes = new Hono()

// Style prompt enhancements
const STYLE_PROMPTS: Record<string, string> = {
  photorealistic: ", photorealistic, 8k, ultra detailed, professional photography, sharp focus, realistic lighting",
  anime: ", anime style, manga art, vibrant colors, detailed anime illustration",
  "3d": ", 3D render, Pixar style, CGI, high quality 3D graphics, octane render, cinema 4D",
  cyberpunk: ", cyberpunk, neon lights, futuristic, blade runner aesthetic, dark sci-fi, neon city",
}

// Aspect ratio to size mapping
const ASPECT_RATIO_MAP: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1344, height: 768 },
  "9:16": { width: 768, height: 1344 },
}

// GET /api/image — health check
imageRoutes.get("/", (c) => {
  return c.json({ ok: true, message: "Image API (OpenRouter). Use POST to generate images.", model: "black-forest-labs/flux-1-schnell" })
})

// POST /api/image — generate image via OpenRouter (black-forest-labs/flux-1-schnell)
imageRoutes.post("/", async (c) => {
  const startTime = Date.now()
  console.log(`[Image] POST /api/image start`)

  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.error("[Image] OPENROUTER_API_KEY missing")
      return c.json({ error: "Image generation service is not available. Please check API configuration." }, 503)
    }

    let body: {
      prompt?: string
      aspectRatio?: string
      numImages?: number
      style?: string
      mode?: string
      engine?: string
      specializedEngine?: string
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

    // Build enhanced prompt
    let enhancedPrompt = prompt
    if (body.style && STYLE_PROMPTS[body.style]) {
      enhancedPrompt += STYLE_PROMPTS[body.style]
    }

    const size = ASPECT_RATIO_MAP[body.aspectRatio || "1:1"] || ASPECT_RATIO_MAP["1:1"]
    const numToGenerate = Math.min(Math.max(body.numImages || 1, 1), 4)

    console.log(`[Image] model=black-forest-labs/flux-1-schnell, prompt="${enhancedPrompt.substring(0, 80)}...", n=${numToGenerate}`)

    // OpenRouter image generation endpoint (OpenAI-compatible)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 50000)

    const generatedImages: Array<{
      id: string; url: string; prompt: string; aspectRatio: string;
      style: string; mode: string; createdAt: string; creditCost: number;
    }> = []

    for (let i = 0; i < numToGenerate; i++) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.VITE_BASE_URL || "https://synapse.app",
            "X-Title": "Synapse",
          },
          body: JSON.stringify({
            model: "black-forest-labs/flux-1-schnell",
            prompt: enhancedPrompt,
            n: 1,
            size: `${size.width}x${size.height}`,
          }),
        })

        console.log(`[Image] OpenRouter response: ${response.status}, elapsed: ${Date.now() - startTime}ms`)

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error")
          console.error(`[Image] OpenRouter error ${response.status}:`, errorText.slice(0, 500))

          if (generatedImages.length > 0) break

          if (response.status === 429) {
            return c.json({ error: "High demand right now. Please wait a moment and try again." }, 429)
          }
          if (response.status === 402 || response.status === 403) {
            return c.json({ error: "High load on GPU servers, please try again later." }, 500)
          }
          return c.json({ error: "Failed to generate image. Please try again." }, 500)
        }

        const data = await response.json() as { data?: Array<{ url?: string; b64_json?: string }> }

        if (data.data && data.data.length > 0) {
          for (const image of data.data) {
            const imageUrl = image.url || (image.b64_json ? `data:image/png;base64,${image.b64_json}` : null)
            if (imageUrl) {
              generatedImages.push({
                id: `${Date.now()}-${generatedImages.length}`,
                url: imageUrl,
                prompt: prompt,
                aspectRatio: body.aspectRatio || "1:1",
                style: body.style || "photorealistic",
                mode: body.mode || "text-to-image",
                createdAt: new Date().toISOString(),
                creditCost: 1,
              })
            }
          }
        }
      } catch (fetchErr) {
        const isAbort = fetchErr instanceof Error && fetchErr.name === 'AbortError'
        console.error(`[Image] Fetch error (${isAbort ? 'timeout' : 'network'}):`, fetchErr)
        if (generatedImages.length > 0) break
        clearTimeout(timeout)
        return c.json({ error: isAbort ? "Request timeout. Please try again." : "Network error. Please try again." }, 503)
      }
    }

    clearTimeout(timeout)

    if (generatedImages.length === 0) {
      return c.json({ error: "Unable to generate images at this time. Please try a different prompt or try again later." }, 500)
    }

    console.log(`[Image] Success, ${generatedImages.length} images, total elapsed: ${Date.now() - startTime}ms`)
    return c.json({ images: generatedImages, totalCreditCost: generatedImages.length }, 201)
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error(`[Image] Unexpected error after ${elapsed}ms:`, error)
    return c.json({ error: "Internal error. Please try again." }, 500)
  }
})

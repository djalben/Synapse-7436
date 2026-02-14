import { Hono } from "hono"

export const imageRoutes = new Hono()

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const TIMEOUT_MS = 45000 // 45s — safely under Vercel's 60s limit

// Model routing by engine ID
const ENGINE_MODELS: Record<string, string> = {
  "flux-schnell": "black-forest-labs/flux.2-klein-4b",      // Free, fast — РАБОЧИЙ ID из утра
  "nana-banana": "google/gemini-3-pro-image-preview",        // Nano Banana Pro
  "imagen-3": "google/gemini-3-pro-image-preview",           // Фронтенд key → Gemini 3 Pro Image
  "flux-pro": "black-forest-labs/flux-1-dev",                // Flux.1 dev, high quality — РАБОЧИЙ ID из утра
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

/** Convert a Base64 data URI or URL to a Buffer */
async function imageToBuffer(imageData: string): Promise<Buffer> {
  if (imageData.startsWith("data:")) {
    const base64 = imageData.split(",")[1]
    return Buffer.from(base64, "base64")
  }
  const res = await fetch(imageData)
  return Buffer.from(await res.arrayBuffer())
}

/** Create a small JPEG thumbnail as a data URI (256px, q60) */
async function createThumbnail(buf: Buffer): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default
    const thumb = await sharp(buf)
      .resize(256, 256, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 60 })
      .toBuffer()
    return `data:image/jpeg;base64,${thumb.toString("base64")}`
  } catch {
    return null // sharp not available — caller will use fallback
  }
}

/** Upload a buffer to Vercel Blob, return public URL */
async function uploadToBlob(buf: Buffer, idx: number): Promise<string> {
  const { put } = await import("@vercel/blob")
  const blob = await put(`synapse/img-${Date.now()}-${idx}.png`, buf, {
    access: "public",
    contentType: "image/png",
  })
  console.log(`[Image] Blob upload ${idx}: ${blob.url} (${buf.length} bytes)`)
  return blob.url
}

// POST /image — generate 4 image variants in parallel (Midjourney-style grid)
imageRoutes.post("/", async (c) => {
  const startTime = Date.now()
  console.log(`[Image] POST start — variant grid mode`)

  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.error("[Image] OPENROUTER_API_KEY missing")
      return c.json({ error: "Image generation service is not available." }, 503)
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[Image] BLOB_READ_WRITE_TOKEN missing")
      return c.json({ error: "Blob storage is not configured." }, 503)
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
    const variantCount = 4

    const selectedModel = ENGINE_MODELS[body.engine || ""] || DEFAULT_MODEL
    console.log(`[Image] model=${selectedModel}, engine=${body.engine}, ar=${aspectRatio}, variants=${variantCount}, prompt="${enhancedPrompt.substring(0, 60)}"`)
    if (selectedModel === "google/gemini-3-pro-image-preview") {
      console.log(`[Image] >>> TESTING GOOGLE NANO BANANA: google/gemini-3-pro-image-preview`)
    }

    // ── Fire 4 parallel requests to OpenRouter ──
    console.log(`[Image] >>> MODEL ID: "${selectedModel}", URL: ${OPENROUTER_URL}`)
    const makeRequest = () =>
      fetchWithTimeout(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.VITE_BASE_URL || "https://synapse.app",
          "X-Title": "Synapse",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "user", content: enhancedPrompt }],
          modalities: ["image"],
          stream: false,
          image_config: { aspect_ratio: aspectRatio },
        }),
      }, TIMEOUT_MS)

    console.log(`[Image] Firing ${variantCount} parallel requests...`)
    const fetchResults = await Promise.allSettled(
      Array.from({ length: variantCount }, () => makeRequest())
    )
    console.log(`[Image] All fetches settled in ${Date.now() - startTime}ms`)

    // ── Extract raw image data from each response ──
    const rawImages: string[] = []
    for (let i = 0; i < fetchResults.length; i++) {
      const r = fetchResults[i]
      if (r.status !== "fulfilled") {
        console.error(`[Image] Variant ${i} fetch failed:`, r.reason)
        continue
      }
      const response = r.value
      if (!response.ok) {
        const errText = await response.text().catch(() => "?")
        console.error(`[Image] Variant ${i} status ${response.status}: ${errText.slice(0, 500)}`)
        continue
      }
      try {
        const rawText = await response.text()
        console.log(`[Image] Variant ${i} raw length: ${rawText.length}`)
        const data = JSON.parse(rawText) as {
          choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>
        }
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
        if (imageUrl) rawImages.push(imageUrl)
        else console.error(`[Image] Variant ${i}: no image in response`)
      } catch (err) {
        console.error(`[Image] Variant ${i} parse error:`, err)
      }
    }

    if (rawImages.length === 0) {
      return c.json({ error: "No images were generated. Try a different prompt." }, 500)
    }

    console.log(`[Image] ${rawImages.length} raw images extracted. Processing thumbnails + blob...`)

    // ── Process each image: thumbnail + blob upload ──
    const variants: Array<{ id: string; preview: string; link: string }> = []

    await Promise.all(rawImages.map(async (imgData, i) => {
      const buf = await imageToBuffer(imgData)
      console.log(`[Image] Variant ${i} buffer: ${buf.length} bytes`)

      // Upload original to Vercel Blob (mandatory)
      const link = await uploadToBlob(buf, i)

      // Create thumbnail (small Base64 JPEG ~15-30 KB)
      const thumbnail = await createThumbnail(buf)
      const preview = thumbnail || link // fallback to Blob URL if sharp unavailable

      variants.push({ id: `v${i}`, preview, link })
    }))

    // Sort to maintain order
    variants.sort((a, b) => a.id.localeCompare(b.id))

    const totalMs = Date.now() - startTime
    const previewSizes = variants.map(v => v.preview.length)
    console.log(`[Image] Done: ${variants.length} variants, total=${totalMs}ms, preview sizes=[${previewSizes.join(",")}], blob=${variants[0]?.link.startsWith("http") ? "yes" : "no"}`)

    return c.json({
      variants,
      prompt,
      aspectRatio,
      style: body.style || "photorealistic",
      engine: body.engine || "flux-schnell",
    }, 201)
  } catch (error) {
    console.error(`[Image] Unexpected error after ${Date.now() - startTime}ms:`, error)
    return c.json({ error: "Internal error. Please try again." }, 500)
  }
})

// POST /image/magic-prompt — expand a short prompt into a detailed image generation prompt
imageRoutes.post("/magic-prompt", async (c) => {
  const t0 = Date.now()
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) return c.json({ error: "Service not configured" }, 503)

    const { prompt } = await c.req.json() as { prompt?: string }
    if (!prompt?.trim()) return c.json({ error: "Empty prompt" }, 400)

    console.log(`[MagicPrompt] Expanding: "${prompt.trim().substring(0, 60)}"`)

    const res = await fetchWithTimeout(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://synapse-7436.vercel.app",
        "X-Title": "Synapse",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-lite-001",
        messages: [
          {
            role: "system",
            content: "You are an expert image prompt engineer. Given a short description, expand it into a detailed, vivid prompt for an AI image generator. Add specific details about lighting, composition, style, colors, mood, and quality. Keep it under 200 words. Output ONLY the expanded prompt, nothing else."
          },
          { role: "user", content: prompt.trim() }
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    }, 12000)

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[MagicPrompt] Error ${res.status}: ${errText.slice(0, 200)}`)
      return c.json({ error: "Failed to enhance prompt" }, 500)
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const expanded = data.choices?.[0]?.message?.content?.trim()
    if (!expanded) return c.json({ error: "Empty response from LLM" }, 500)

    console.log(`[MagicPrompt] Done in ${Date.now() - t0}ms, length=${expanded.length}`)
    return c.json({ prompt: expanded })
  } catch (err) {
    console.error(`[MagicPrompt] Error after ${Date.now() - t0}ms:`, err)
    return c.json({ error: "Failed to enhance prompt" }, 500)
  }
})

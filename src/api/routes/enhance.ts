import { Hono } from "hono"

export const enhanceRoutes = new Hono()

const REPLICATE_BASE = "https://api.replicate.com/v1"
const REPLICATE_PREDICTIONS = `${REPLICATE_BASE}/predictions`
const CODEFORMER_SLUG = "lucataco/codeformer"
const TIMEOUT_MS = 8000  // Vercel limit ~10s

function getReplicateKey(): string | undefined {
  return process.env.REPLICATE_API_TOKEN
}

function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  return Promise.race([
    fetch(url, init),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT_${ms}ms`)), ms)
    ),
  ])
}

// ─── POST / — create CodeFormer prediction (fire-and-forget) ───
enhanceRoutes.post("/", async (c) => {
  const startTime = Date.now()
  console.log("[Enhance] POST /enhance")

  try {
    const apiKey = getReplicateKey()
    if (!apiKey) {
      console.error("[Enhance] REPLICATE_API_TOKEN missing")
      return c.json({ error: "Enhancement service is not available." }, 503)
    }

    let body: { image?: string; options?: { upscale?: boolean; faceRestore?: boolean; brightness?: boolean } }
    try {
      body = await c.req.json() as typeof body
    } catch {
      return c.json({ error: "Invalid JSON in request body" }, 400)
    }

    const image = body.image
    if (!image || typeof image !== "string") {
      return c.json({ error: "Please upload an image to enhance." }, 400)
    }

    const options = body.options || {}
    const selectedOptions = Object.entries(options).filter(([, v]) => v)
    if (selectedOptions.length === 0) {
      return c.json({ error: "Please select at least one enhancement option." }, 400)
    }

    // Build CodeFormer input based on selected options
    const input: Record<string, unknown> = {
      image,
      upscale: options.upscale ? 2 : 1,
      face_upsample: options.faceRestore !== false,  // default true
      background_enhance: true,
      codeformer_fidelity: 0.7,  // balance between quality and fidelity
    }

    console.log(`[Enhance] CodeFormer options=${selectedOptions.map(([k]) => k).join(",")} upscale=${input.upscale}`)

    // Fire-and-forget: create prediction via Replicate Models API
    const modelsUrl = `${REPLICATE_BASE}/models/${CODEFORMER_SLUG}/predictions`
    console.log(`[Enhance] POST ${modelsUrl}`)

    const response = await fetchWithTimeout(modelsUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
    }, TIMEOUT_MS)

    const elapsed = Date.now() - startTime
    console.log(`[Enhance] Replicate responded: ${response.status} in ${elapsed}ms`)

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Enhance] Replicate error: ${errText}`)
      return c.json({ error: "Улучшение не удалось. Попробуйте снова.", detail: errText }, 500)
    }

    const data = await response.json() as { id: string; status: string }
    console.log(`[Enhance] Prediction created: id=${data.id} status=${data.status}`)

    // Return immediately — frontend will poll GET /status/:id
    return c.json({
      id: data.id,
      status: "processing",
      originalUrl: image,
    })

  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error(`[Enhance] Error after ${elapsed}ms:`, error)
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("TIMEOUT")) {
      return c.json({ error: "Сервис не отвечает. Попробуйте снова." }, 504)
    }
    return c.json({ error: "Улучшение не удалось." }, 500)
  }
})

// ─── GET /status/:id — poll CodeFormer prediction status ───
enhanceRoutes.get("/status/:id", async (c) => {
  const predictionId = c.req.param("id")
  console.log(`[Enhance] GET /status/${predictionId}`)

  try {
    const apiKey = getReplicateKey()
    if (!apiKey) return c.json({ error: "Service not configured." }, 503)

    const response = await fetchWithTimeout(`${REPLICATE_PREDICTIONS}/${predictionId}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${apiKey}` },
    }, TIMEOUT_MS)

    if (!response.ok) {
      console.error(`[Enhance] Status error: ${response.status}`)
      return c.json({ id: predictionId, status: "processing" })
    }

    const data = await response.json() as {
      id: string
      status: string
      output?: string | string[] | { url: string }
      error?: string
    }

    console.log(`[Enhance] Status ${predictionId}: ${data.status}`)

    if (data.status === "succeeded" && data.output) {
      let enhancedUrl: string | null = null
      if (typeof data.output === "string") enhancedUrl = data.output
      else if (Array.isArray(data.output)) enhancedUrl = data.output[0]
      else if (typeof data.output === "object" && "url" in data.output) enhancedUrl = data.output.url

      if (enhancedUrl) {
        return c.json({ id: predictionId, status: "completed", enhancedUrl })
      }
    }

    if (data.status === "failed" || data.status === "canceled") {
      return c.json({ id: predictionId, status: "failed", error: data.error || "Улучшение не удалось." })
    }

    return c.json({ id: predictionId, status: "processing" })

  } catch (err) {
    console.error(`[Enhance] Status check error:`, err)
    return c.json({ id: predictionId, status: "processing" })
  }
})

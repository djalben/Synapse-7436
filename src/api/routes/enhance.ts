import { Hono } from "hono"

export const enhanceRoutes = new Hono()

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const ENHANCE_MODEL = "sourceful/riverflow-v2-fast"
const TIMEOUT_MS = 45000

// Prompt fragments for each enhancement option
const OPTION_PROMPTS: Record<string, string> = {
  upscale: "Enhance image resolution. Maintain authentic film grain and skin pores. Strictly avoid artificial smoothing or plastic skin effect.",
  faceRestore: "Sharpen facial features naturally. Do NOT apply beauty filters. Preserve the original character, wrinkles, and skin texture.",
  brightness: "Professional color grading. Balance shadows and highlights to look like a high-end cinematic shot.",
}

/** Promise.race timeout */
function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  return Promise.race([
    fetch(url, init),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ])
}

enhanceRoutes.post("/", async (c) => {
  const startTime = Date.now()
  console.log("[Enhance] POST start")

  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.error("[Enhance] OPENROUTER_API_KEY missing")
      return c.json({ error: "Enhancement service is not available." }, 503)
    }

    let body: { image?: string; options?: { upscale?: boolean; faceRestore?: boolean; brightness?: boolean } }
    try {
      body = await c.req.json() as typeof body
    } catch {
      return c.json({ error: "Invalid JSON in request body" }, 400)
    }

    const image = body.image
    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return c.json({ error: "Please upload an image to enhance." }, 400)
    }

    const options = body.options || {}
    const selectedOptions = Object.entries(options).filter(([, v]) => v)
    if (selectedOptions.length === 0) {
      return c.json({ error: "Please select at least one enhancement option." }, 400)
    }

    // Build prompt from selected checkboxes
    const promptParts = selectedOptions
      .map(([key]) => OPTION_PROMPTS[key])
      .filter(Boolean)
    const enhancePrompt = `Enhance this photo professionally. ${promptParts.join(". ")}. Keep the person's identity and expression identical. Output a high-quality photograph.`

    console.log(`[Enhance] options=${selectedOptions.map(([k]) => k).join(",")}, prompt="${enhancePrompt.substring(0, 80)}..."`)

    // Multimodal message: text + image (same structure as Nano Banana Pro)
    const messageContent = [
      { type: "text", text: enhancePrompt },
      { type: "image_url", image_url: { url: image } },
    ]

    const response = await fetchWithTimeout(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.VITE_BASE_URL || "https://synapse.app",
        "X-Title": "Synapse",
      },
      body: JSON.stringify({
        model: ENHANCE_MODEL,
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image"],
        stream: false,
      }),
    }, TIMEOUT_MS)

    if (!response.ok) {
      const errText = await response.text().catch(() => "?")
      console.error(`[Enhance] OpenRouter error ${response.status}: ${errText.slice(0, 500)}`)
      return c.json({ error: "Enhancement failed. Please try again." }, 500)
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }>
    }
    const enhancedUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url

    if (!enhancedUrl) {
      console.error("[Enhance] No image in response")
      return c.json({ error: "No enhanced image was returned. Try again." }, 500)
    }

    const processingTime = Date.now() - startTime
    console.log(`[Enhance] Done in ${processingTime}ms`)

    return c.json({
      originalUrl: image,
      enhancedUrl,
      processingTime,
      creditCost: 2,
    })
  } catch (error) {
    console.error(`[Enhance] Error after ${Date.now() - startTime}ms:`, error)
    return c.json({ error: "Enhancement is taking longer than expected. Please try again." }, 500)
  }
})

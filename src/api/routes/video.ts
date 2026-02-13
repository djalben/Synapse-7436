import { Hono } from "hono"

export const videoRoutes = new Hono()

// FAL.ai Kling v1.5 endpoints (OpenRouter does NOT support video generation)
const FAL_TEXT2VIDEO = "https://queue.fal.run/fal-ai/kling-video/v1.5/pro/text-to-video"
const FAL_IMG2VIDEO = "https://queue.fal.run/fal-ai/kling-video/v1.5/pro/image-to-video"
const TIMEOUT_MS = 55000

// Animation preset prompt mapping
const PRESET_PROMPTS: Record<string, string> = {
  "smile-blink": "person smiles warmly, natural eye blinks, subtle head movement, genuine expression",
  "wave-hello": "person waves hand, friendly expression, natural arm movement, welcoming gesture",
  "look-around": "person looks left then right, curious expression, natural head turn, subtle movement",
  "old-film": "vintage film effect, sepia tones, film grain, slow deliberate movement, nostalgic aesthetic",
}

/** Promise.race timeout */
function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  return Promise.race([
    fetch(url, init),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT_${ms}ms`)), ms)
    ),
  ])
}

function getFalKey(): string | undefined {
  return process.env.FAL_KEY
}

// ─── POST /generate — queue video generation on FAL.ai, return request_id
videoRoutes.post("/generate", async (c) => {
  const startTime = Date.now()
  console.log("[Video] POST /generate start")

  try {
    const falKey = getFalKey()
    if (!falKey) {
      console.error("[Video] FAL_KEY missing")
      return c.json({ error: "Video generation service not configured. Set FAL_KEY in environment." }, 503)
    }

    const { prompt, duration = 5, aspectRatio = "16:9", image } = await c.req.json()

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Please describe your video scene." }, 400)
    }

    const validDurations = [5, 10]
    const finalDuration = validDurations.includes(duration) ? duration : 5

    // Build enhanced prompt
    let enhancedPrompt = prompt.trim()
    enhancedPrompt += ", cinematic quality, smooth motion, professional video"

    console.log(`[Video] Prompt: "${enhancedPrompt.slice(0, 80)}..." duration=${finalDuration}s`)

    // Choose endpoint: text-to-video or image-to-video
    const endpoint = image ? FAL_IMG2VIDEO : FAL_TEXT2VIDEO
    const body: Record<string, unknown> = {
      prompt: enhancedPrompt,
      duration: String(finalDuration),
      aspect_ratio: aspectRatio,
    }
    if (image) {
      body.image_url = image
    }

    console.log(`[Video] Sending to FAL.ai... endpoint=${image ? "img2video" : "text2video"}`)
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }, TIMEOUT_MS)

    const elapsed = Date.now() - startTime
    console.log(`[Video] FAL responded: ${response.status} in ${elapsed}ms`)

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Video] FAL error: ${errText}`)
      return c.json({ error: "Video generation failed. Please try again.", detail: errText }, 500)
    }

    const data = await response.json() as {
      request_id?: string;
      status?: string;
    }

    console.log(`[Video] Queued: request_id=${data.request_id} status=${data.status}`)

    if (!data.request_id) {
      console.error("[Video] No request_id in response:", JSON.stringify(data).slice(0, 300))
      return c.json({ error: "Unexpected response from video service." }, 500)
    }

    return c.json({
      id: data.request_id,
      status: "processing",
      prompt: prompt.trim(),
      duration: finalDuration,
      endpoint: image ? "img2video" : "text2video",
      createdAt: new Date().toISOString(),
    })

  } catch (err) {
    const elapsed = Date.now() - startTime
    console.error(`[Video] Error after ${elapsed}ms:`, err)
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("TIMEOUT")) {
      return c.json({ error: "Video generation is taking longer than expected. Please try again." }, 504)
    }
    return c.json({ error: "Video generation failed.", detail: msg }, 500)
  }
})

// ─── GET /status/:id — poll FAL.ai for generation result
videoRoutes.get("/status/:id", async (c) => {
  const requestId = c.req.param("id")
  const endpoint = c.req.query("endpoint") || "text2video"
  console.log(`[Video] GET /status/${requestId}`)

  try {
    const falKey = getFalKey()
    if (!falKey) {
      return c.json({ error: "Service not configured." }, 503)
    }

    // Determine which FAL endpoint was used
    const baseUrl = endpoint === "img2video" ? FAL_IMG2VIDEO : FAL_TEXT2VIDEO
    const statusUrl = `${baseUrl}/requests/${requestId}/status`

    const response = await fetchWithTimeout(statusUrl, {
      method: "GET",
      headers: {
        "Authorization": `Key ${falKey}`,
      },
    }, 15000)

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Video] Status check error: ${response.status} ${errText}`)
      if (response.status === 404) {
        return c.json({ id: requestId, status: "processing" })
      }
      return c.json({ error: "Failed to check status.", detail: errText }, 500)
    }

    const data = await response.json() as {
      status: string; // IN_QUEUE, IN_PROGRESS, COMPLETED
      response_url?: string;
    }

    console.log(`[Video] Status for ${requestId}: ${data.status}`)

    // If completed, fetch the actual result
    if (data.status === "COMPLETED") {
      const resultUrl = `${baseUrl}/requests/${requestId}`
      const resultRes = await fetchWithTimeout(resultUrl, {
        method: "GET",
        headers: { "Authorization": `Key ${falKey}` },
      }, 15000)

      if (resultRes.ok) {
        const result = await resultRes.json() as {
          video?: { url?: string };
        }

        const videoUrl = result.video?.url
        if (videoUrl) {
          console.log(`[Video] Completed: ${videoUrl.slice(0, 60)}...`)
          return c.json({ id: requestId, status: "completed", url: videoUrl })
        }
      }

      return c.json({ id: requestId, status: "failed", error: "Could not retrieve video." })
    }

    if (data.status === "FAILED") {
      return c.json({ id: requestId, status: "failed", error: "Video generation failed on server." })
    }

    // IN_QUEUE or IN_PROGRESS
    return c.json({ id: requestId, status: "processing" })

  } catch (err) {
    console.error(`[Video] Status check error:`, err)
    return c.json({ id: requestId, status: "processing" })
  }
})

// ─── POST /animate — portrait animation (image-to-video with preset)
videoRoutes.post("/animate", async (c) => {
  try {
    console.log("[Video] POST /animate start")

    const falKey = getFalKey()
    if (!falKey) {
      return c.json({ error: "Video generation service not configured. Set FAL_KEY." }, 503)
    }

    const { image, preset, duration, prompt: userPrompt } = await c.req.json()

    if (!image || typeof image !== "string") {
      return c.json({ error: "Please upload an image to animate." }, 400)
    }

    if (!preset || !PRESET_PROMPTS[preset]) {
      return c.json({ error: "Please select an animation style." }, 400)
    }

    const validDurations = [5, 10]
    const finalDuration = validDurations.includes(duration) ? duration : 5

    const animationPrompt = PRESET_PROMPTS[preset]
    const fullPrompt =
      typeof userPrompt === "string" && userPrompt.trim()
        ? userPrompt.trim()
        : `Animate this portrait: ${animationPrompt}`

    const response = await fetchWithTimeout(FAL_IMG2VIDEO, {
      method: "POST",
      headers: {
        "Authorization": `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        image_url: image,
        duration: String(finalDuration),
        aspect_ratio: "9:16",
      }),
    }, TIMEOUT_MS)

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Video] Animate error: ${errText}`)
      return c.json({ error: "Animation failed. Please try again." }, 500)
    }

    const data = await response.json() as { request_id?: string }

    if (!data.request_id) {
      return c.json({ error: "Unexpected response from animation service." }, 500)
    }

    return c.json({
      id: data.request_id,
      status: "processing",
      endpoint: "img2video",
      preset,
      duration: finalDuration,
      createdAt: new Date().toISOString(),
    })

  } catch (err) {
    console.error("[Video] Animate error:", err)
    return c.json({ error: "Animation failed. Please try again later." }, 500)
  }
})

// ─── GET / — health check
videoRoutes.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "video",
    provider: "fal.ai",
    model: "kling-v1.5-pro",
    configured: !!getFalKey(),
  })
})

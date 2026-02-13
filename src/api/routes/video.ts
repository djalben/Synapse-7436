import { Hono } from "hono"

export const videoRoutes = new Hono()

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
const TIMEOUT_MS = 55000 // 55s — safely under Vercel's 60s maxDuration

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

// ─── POST /generate — start video generation, return task ID
videoRoutes.post("/generate", async (c) => {
  const startTime = Date.now()
  console.log("[Video] POST /generate start")

  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.error("[Video] OPENROUTER_API_KEY missing")
      return c.json({ error: "Video generation service not configured." }, 503)
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
    if (finalDuration === 10) {
      enhancedPrompt += ", extended scene, continuous action"
    }

    console.log(`[Video] Prompt: "${enhancedPrompt.slice(0, 80)}..." duration=${finalDuration}s`)

    // Build messages — text-to-video or image-to-video
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: `Generate a ${finalDuration}-second video: ${enhancedPrompt}` }
    ]
    if (image) {
      userContent.push({ type: "image_url", image_url: { url: image } })
    }

    const body = {
      model: "kling-ai/kling-v1-5",
      messages: [{ role: "user", content: userContent }],
      modalities: ["video"],
      video_config: {
        duration: finalDuration,
        aspect_ratio: aspectRatio,
      },
    }

    console.log(`[Video] Sending to OpenRouter... model=kling-ai/kling-v1-5`)
    const response = await fetchWithTimeout(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://synapse-7436.vercel.app",
        "X-Title": "Synapse Video Studio",
      },
      body: JSON.stringify(body),
    }, TIMEOUT_MS)

    const elapsed = Date.now() - startTime
    console.log(`[Video] OpenRouter responded: ${response.status} in ${elapsed}ms`)

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Video] OpenRouter error: ${errText}`)
      return c.json({ error: "Video generation failed. Please try again.", detail: errText }, response.status as 400 | 500)
    }

    const data = await response.json() as {
      id?: string;
      choices?: Array<{
        message?: {
          content?: string | Array<{ type: string; video_url?: string; url?: string }>;
        }
      }>;
      generation_id?: string;
    }

    console.log(`[Video] Response keys: ${Object.keys(data).join(", ")}`)

    // Case 1: Async generation — OpenRouter returns a generation_id to poll
    if (data.generation_id) {
      console.log(`[Video] Async generation started: ${data.generation_id}`)
      return c.json({
        id: data.generation_id,
        status: "processing",
        prompt: prompt.trim(),
        duration: finalDuration,
        createdAt: new Date().toISOString(),
      })
    }

    // Case 2: Sync response — video URL in choices
    if (data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content
      let videoUrl: string | null = null

      if (typeof content === "string") {
        // Try to extract URL from text
        const urlMatch = content.match(/https?:\/\/[^\s"']+\.(mp4|webm|mov)/i)
        videoUrl = urlMatch ? urlMatch[0] : null
      } else if (Array.isArray(content)) {
        // Look for video_url in content array
        for (const part of content) {
          if (part.video_url) { videoUrl = part.video_url; break }
          if (part.url) { videoUrl = part.url; break }
        }
      }

      if (videoUrl) {
        console.log(`[Video] Got video URL directly: ${videoUrl.slice(0, 60)}...`)
        return c.json({
          id: data.id || `video-${Date.now()}`,
          status: "completed",
          url: videoUrl,
          prompt: prompt.trim(),
          duration: finalDuration,
          createdAt: new Date().toISOString(),
        })
      }
    }

    // Case 3: Response has an ID but no video yet — treat as async
    if (data.id) {
      console.log(`[Video] Got response ID, treating as async: ${data.id}`)
      return c.json({
        id: data.id,
        status: "processing",
        prompt: prompt.trim(),
        duration: finalDuration,
        createdAt: new Date().toISOString(),
      })
    }

    console.error("[Video] Unexpected response format:", JSON.stringify(data).slice(0, 500))
    return c.json({ error: "Unexpected response from video service." }, 500)

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

// ─── GET /status/:id — poll for generation result
videoRoutes.get("/status/:id", async (c) => {
  const generationId = c.req.param("id")
  console.log(`[Video] GET /status/${generationId}`)

  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return c.json({ error: "Service not configured." }, 503)
    }

    // Poll OpenRouter for generation status
    const response = await fetchWithTimeout(
      `https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      },
      15000
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Video] Status check error: ${response.status} ${errText}`)
      // If 404, generation might still be processing
      if (response.status === 404) {
        return c.json({ id: generationId, status: "processing" })
      }
      return c.json({ error: "Failed to check status.", detail: errText }, 500)
    }

    const data = await response.json() as {
      id?: string;
      status?: string;
      output?: string | { video_url?: string; url?: string };
      error?: string;
      choices?: Array<{
        message?: {
          content?: string | Array<{ type: string; video_url?: string; url?: string }>;
        }
      }>;
    }

    console.log(`[Video] Status for ${generationId}: ${data.status || "unknown"}`)

    // Extract video URL from various response formats
    let videoUrl: string | null = null

    if (typeof data.output === "string") {
      videoUrl = data.output
    } else if (data.output && typeof data.output === "object") {
      videoUrl = data.output.video_url || data.output.url || null
    }

    if (!videoUrl && data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content
      if (typeof content === "string") {
        const urlMatch = content.match(/https?:\/\/[^\s"']+\.(mp4|webm|mov)/i)
        videoUrl = urlMatch ? urlMatch[0] : null
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (part.video_url) { videoUrl = part.video_url; break }
          if (part.url) { videoUrl = part.url; break }
        }
      }
    }

    if (videoUrl) {
      return c.json({ id: generationId, status: "completed", url: videoUrl })
    }

    if (data.error) {
      return c.json({ id: generationId, status: "failed", error: data.error })
    }

    // Still processing
    return c.json({ id: generationId, status: data.status || "processing" })

  } catch (err) {
    console.error(`[Video] Status check error:`, err)
    return c.json({ id: generationId, status: "processing" })
  }
})

// ─── POST /animate — portrait animation (image-to-video with preset)
videoRoutes.post("/animate", async (c) => {
  try {
    console.log("[Video] POST /animate start")

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return c.json({ error: "Video generation service not configured." }, 503)
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

    const body = {
      model: "kling-ai/kling-v1-5",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `Generate a ${finalDuration}-second animation: ${fullPrompt}` },
          { type: "image_url", image_url: { url: image } },
        ]
      }],
      modalities: ["video"],
      video_config: {
        duration: finalDuration,
        aspect_ratio: "9:16",
      },
    }

    const response = await fetchWithTimeout(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://synapse-7436.vercel.app",
        "X-Title": "Synapse Video Studio",
      },
      body: JSON.stringify(body),
    }, TIMEOUT_MS)

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Video] Animate error: ${errText}`)
      return c.json({ error: "Animation failed. Please try again." }, 500)
    }

    const data = await response.json() as { id?: string; generation_id?: string }

    const taskId = data.generation_id || data.id || `animate-${Date.now()}`
    return c.json({
      id: taskId,
      status: "processing",
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
  return c.json({ status: "ok", service: "video", model: "kling-ai/kling-v1-5" })
})

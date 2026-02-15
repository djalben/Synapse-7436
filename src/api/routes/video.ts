import { Hono } from "hono"

export const videoRoutes = new Hono()

const REPLICATE_BASE = "https://api.replicate.com/v1"
const REPLICATE_PREDICTIONS = `${REPLICATE_BASE}/predictions`
const TIMEOUT_MS = 8000  // Vercel serverless limit ~10s, keep margin

// ─── Model registry: Replicate model slugs ───
interface VideoModelConfig {
  name: string
  text: string | null   // Replicate model for text-to-video (null = not supported)
  image: string | null  // Replicate model for image-to-video (null = not supported)
  defaultInput?: Record<string, unknown>
}

const MODEL_REGISTRY: Record<string, VideoModelConfig> = {
  "wan-2.2": {
    name: "Wan 2.2 Fast",
    text: "wan-video/wan-2.2-t2v-fast",
    image: "wan-video/wan-2.2-i2v-fast",
  },
  "kling-2.6": {
    name: "Kling 2.6 Pro",
    text: "kwaivgi/kling-v2.6",
    image: "kwaivgi/kling-v2.6",
  },
  "veo-3.1": {
    name: "Google Veo 3.1",
    text: "google-deepmind/veo-3",
    image: null,
  },
}

// Camera motion prompt suffixes
const CAMERA_MOTION: Record<string, string> = {
  static: "",
  "zoom-in": ", camera slowly zooms in, smooth dolly forward",
  "zoom-out": ", camera slowly zooms out, smooth dolly back",
  pan: ", camera pans smoothly from left to right, cinematic pan",
  orbit: ", camera orbits slowly around the subject, 360 rotation",
  tilt: ", camera tilts upward, smooth vertical pan, reveal shot",
}

function getReplicateKey(): string | undefined {
  return process.env.REPLICATE_API_TOKEN
}

function getOpenRouterKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY
}

function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  return Promise.race([
    fetch(url, init),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT_${ms}ms`)), ms)
    ),
  ])
}

// ─── Magic Prompt: enhance user description via GPT-4o-mini ───
async function enhancePrompt(raw: string): Promise<string> {
  const key = getOpenRouterKey()
  if (!key) return raw

  try {
    const res = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: "You are a cinematic video prompt engineer. Expand the user's short description into a detailed, vivid video generation prompt in English. Keep it under 200 words. Focus on camera movement, lighting, mood, and visual details. Output ONLY the enhanced prompt, nothing else.",
          },
          { role: "user", content: raw },
        ],
      }),
    }, 10000)

    if (!res.ok) return raw
    const data = await res.json() as any
    const enhanced = data?.choices?.[0]?.message?.content?.trim()
    return enhanced || raw
  } catch {
    return raw
  }
}

// ─── POST /generate — create video via Replicate ───
videoRoutes.post("/generate", async (c) => {
  const startTime = Date.now()
  console.log("[Video] POST /generate")

  try {
    const apiKey = getReplicateKey()
    if (!apiKey) {
      return c.json({ error: "REPLICATE_API_TOKEN not configured." }, 503)
    }

    const {
      prompt,
      model = "wan-2.2",
      mode = "text",        // "text" | "image"
      image,                // base64 or URL for image-to-video
      aspectRatio = "16:9",
      cameraMotion = "static",
      magicPrompt = false,
    } = await c.req.json()

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Опишите сцену для видео." }, 400)
    }

    const modelConfig = MODEL_REGISTRY[model]
    if (!modelConfig) {
      return c.json({ error: `Unknown model: ${model}` }, 400)
    }

    const isImageMode = mode === "image" && image
    const replicateModel = isImageMode ? modelConfig.image : modelConfig.text
    if (!replicateModel) {
      return c.json({ error: `${modelConfig.name} не поддерживает режим ${isImageMode ? "Фото→Видео" : "Текст→Видео"}.` }, 400)
    }

    // Build prompt (magic prompt done synchronously only if fast enough)
    let finalPrompt = prompt.trim()
    if (magicPrompt) {
      try {
        const enhanced = await Promise.race([
          enhancePrompt(finalPrompt),
          new Promise<string>((_, reject) => setTimeout(() => reject("timeout"), 4000)),
        ])
        finalPrompt = enhanced
        console.log(`[Video] Magic prompt: "${finalPrompt.slice(0, 80)}..."`)
      } catch {
        console.log(`[Video] Magic prompt skipped (timeout)`)
      }
    }
    finalPrompt += (CAMERA_MOTION[cameraMotion] || "")
    finalPrompt += ", cinematic quality, smooth motion, professional video"

    // Build model-specific Replicate input
    let input: Record<string, unknown> = {}

    if (model === "wan-2.2") {
      input = {
        prompt: finalPrompt,
        fast_mode: "Balanced",
        sample_steps: 30,
        frames_per_second: 16,
        aspect_ratio: aspectRatio,
      }
    } else if (model === "kling-2.6") {
      input = {
        prompt: finalPrompt,
        duration: 5,
        aspect_ratio: aspectRatio,
        generate_audio: true,
      }
      if (isImageMode && image) {
        input.start_image = image
      }
    } else if (model === "veo-3.1") {
      input = {
        prompt: finalPrompt,
      }
    } else {
      input = { prompt: finalPrompt }
    }

    console.log(`[Video] Model=${replicateModel} mode=${isImageMode ? "i2v" : "t2v"} aspect=${aspectRatio} cam=${cameraMotion}`)
    console.log(`[Video] Calling Replicate with slug: ${replicateModel}`)
    console.log(`[Video] Input:`, JSON.stringify(input))

    // Use the Models API: POST /v1/models/{owner}/{name}/predictions
    // This does NOT require a version hash — unlike POST /v1/predictions which needs {version}
    const modelsUrl = `${REPLICATE_BASE}/models/${replicateModel}/predictions`
    console.log(`[Video] POST ${modelsUrl}`)

    // Fire-and-forget: create prediction, do NOT wait for completion
    // Replicate returns immediately with {id, status: "starting"}
    const response = await fetchWithTimeout(modelsUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
    }, TIMEOUT_MS)

    const elapsed = Date.now() - startTime
    console.log(`[Video] Replicate responded: ${response.status} in ${elapsed}ms`)

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Video] Replicate error: ${errText}`)
      return c.json({ error: "Генерация видео не удалась. Попробуйте снова.", detail: errText }, 500)
    }

    const data = await response.json() as {
      id: string
      status: string
    }

    console.log(`[Video] Prediction created: id=${data.id} status=${data.status}`)

    // Return immediately — frontend will poll GET /status/:id
    return c.json({
      id: data.id,
      status: "processing",
      model,
      prompt: prompt.trim(),
      createdAt: new Date().toISOString(),
    })

  } catch (err) {
    const elapsed = Date.now() - startTime
    console.error(`[Video] Error after ${elapsed}ms:`, err)
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("TIMEOUT")) {
      return c.json({ error: "Генерация занимает слишком долго. Попробуйте снова." }, 504)
    }
    return c.json({ error: "Генерация видео не удалась.", detail: msg }, 500)
  }
})

// ─── GET /status/:id — poll Replicate prediction status ───
videoRoutes.get("/status/:id", async (c) => {
  const predictionId = c.req.param("id")
  console.log(`[Video] GET /status/${predictionId}`)

  try {
    const apiKey = getReplicateKey()
    if (!apiKey) return c.json({ error: "Service not configured." }, 503)

    const response = await fetchWithTimeout(`${REPLICATE_PREDICTIONS}/${predictionId}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${apiKey}` },
    }, TIMEOUT_MS)

    if (!response.ok) {
      console.error(`[Video] Status error: ${response.status}`)
      return c.json({ id: predictionId, status: "processing" })
    }

    const data = await response.json() as {
      id: string
      status: string // starting, processing, succeeded, failed, canceled
      output?: string | string[] | { url: string }
      error?: string
      logs?: string
    }

    console.log(`[Video] Status ${predictionId}: ${data.status}`)

    if (data.status === "succeeded" && data.output) {
      let videoUrl: string | null = null
      if (typeof data.output === "string") videoUrl = data.output
      else if (Array.isArray(data.output)) videoUrl = data.output[0]
      else if (typeof data.output === "object" && "url" in data.output) videoUrl = data.output.url

      if (videoUrl) {
        return c.json({ id: predictionId, status: "completed", url: videoUrl })
      }
    }

    if (data.status === "failed" || data.status === "canceled") {
      return c.json({ id: predictionId, status: "failed", error: data.error || "Генерация не удалась." })
    }

    // starting / processing
    return c.json({ id: predictionId, status: "processing" })

  } catch (err) {
    console.error(`[Video] Status check error:`, err)
    return c.json({ id: predictionId, status: "processing" })
  }
})

// ─── GET / — health check ───
videoRoutes.get("/", (c) => {
  return c.json({
    status: "ok",
    service: "video",
    provider: "replicate",
    models: Object.keys(MODEL_REGISTRY),
    configured: !!getReplicateKey(),
  })
})

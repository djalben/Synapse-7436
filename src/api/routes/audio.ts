import { Hono } from "hono"

export const audioRoutes = new Hono()

const REPLICATE_PREDICTIONS = "https://api.replicate.com/v1/predictions"
const MUSICGEN_VERSION = "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb"
const XTTS_VERSION = "684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e"
const TIMEOUT_MS = 8000  // Vercel limit ~10s

// Genre → [tag prefix, mood hint]
const GENRE_MAP: Record<string, { tag: string; mood: string; style: string }> = {
  "Поп":        { tag: "Pop",         mood: "Upbeat, Catchy",   style: "catchy pop melody, modern production, polished mix" },
  "Электроника": { tag: "Electronic",  mood: "Energetic",        style: "electronic dance music, synths, driving beat, four-on-the-floor" },
  "Хип-Хоп":    { tag: "Hip-Hop",     mood: "Rhythmic, Bold",   style: "hip-hop beat, 808 bass, trap hi-hats, rhythmic flow" },
  "Классика":    { tag: "Classical",   mood: "Elegant",          style: "orchestral arrangement, strings, classical instrumentation" },
  "Рок":         { tag: "Rock",        mood: "Powerful",         style: "electric guitars, drums, rock energy, distortion" },
  "Джаз":        { tag: "Jazz",        mood: "Smooth, Groovy",   style: "jazz chords, swing rhythm, saxophone, smooth bass" },
  "Эмбиент":     { tag: "Ambient",     mood: "Relaxing, Dreamy", style: "atmospheric pads, ambient soundscape, reverb, ethereal" },
  // fallback keys (English, lowercase) for backward compat
  pop:           { tag: "Pop",         mood: "Upbeat, Catchy",   style: "catchy pop melody, modern production" },
  electronic:    { tag: "Electronic",  mood: "Energetic",        style: "electronic dance music, synths, driving beat" },
  "hip-hop":     { tag: "Hip-Hop",     mood: "Rhythmic",         style: "hip-hop beat, bass-heavy, rhythmic" },
  classical:     { tag: "Classical",   mood: "Elegant",          style: "orchestral arrangement, classical instrumentation" },
  rock:          { tag: "Rock",        mood: "Powerful",         style: "electric guitars, drums, rock energy" },
  ambient:       { tag: "Ambient",     mood: "Relaxing",         style: "atmospheric, ambient soundscape, relaxing" },
}

function getApiToken(): string | undefined {
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

// ─── POST /music — create MusicGen prediction (fire-and-forget) ───
audioRoutes.post("/music", async (c) => {
  const t0 = Date.now()
  console.log("[Audio] POST /music")

  try {
    const apiToken = getApiToken()
    if (!apiToken) return c.json({ error: "Сервис аудио не настроен." }, 503)

    const { prompt, duration, instrumental, genre, vocalGender } = await c.req.json()
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Пожалуйста, опишите музыку." }, 400)
    }

    // ── Build structured prompt ──
    const parts: string[] = []

    // 1. Genre & mood tags at the front
    const g = genre ? GENRE_MAP[genre] : null
    if (g) {
      parts.push(`[Genre: ${g.tag}]`)
      parts.push(`[Mood: ${g.mood}]`)
      parts.push(g.style)
    }

    // 2. Vocal / instrumental tag
    if (instrumental) {
      parts.push("instrumental only, no vocals")
    } else {
      const gender = vocalGender === "female" ? "female" : "male"
      parts.push(`Song with clear ${gender} leading vocals, singing lyrics melodically, catchy vocal hook`)
    }

    // 3. User description
    parts.push(prompt.trim())

    const enhancedPrompt = parts.join(", ")

    // Duration: MusicGen large supports up to ~120s
    const durationSeconds = Math.min(Math.max(duration || 30, 5), 120)

    const input = {
      prompt: enhancedPrompt,
      duration: durationSeconds,
      model_version: "stereo-large" as const,
      output_format: "mp3" as const,
    }

    console.log(`[Audio] MusicGen input: prompt="${enhancedPrompt.slice(0, 60)}...", dur=${durationSeconds}s`)

    const response = await fetchWithTimeout(REPLICATE_PREDICTIONS, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ version: MUSICGEN_VERSION, input }),
    }, TIMEOUT_MS)

    console.log(`[Audio] MusicGen Replicate: ${response.status} in ${Date.now() - t0}ms`)

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Audio] MusicGen error: ${errText}`)
      return c.json({ error: "Генерация музыки не удалась.", detail: errText }, 500)
    }

    const data = await response.json() as { id: string; status: string }
    console.log(`[Audio] MusicGen prediction: id=${data.id} status=${data.status}`)

    return c.json({
      id: data.id,
      status: "processing",
      type: "music",
      prompt: prompt.trim(),
      duration: durationSeconds,
    })
  } catch (error) {
    console.error(`[Audio] MusicGen error after ${Date.now() - t0}ms:`, error)
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("TIMEOUT")) return c.json({ error: "Сервис не отвечает." }, 504)
    return c.json({ error: "Генерация не удалась." }, 500)
  }
})

// ─── POST /tts — create XTTS-v2 prediction (fire-and-forget) ───
audioRoutes.post("/tts", async (c) => {
  const t0 = Date.now()
  console.log("[Audio] POST /tts")

  try {
    const apiToken = getApiToken()
    if (!apiToken) return c.json({ error: "Сервис озвучки не настроен." }, 503)

    const { text, speaker } = await c.req.json()
    if (!text || typeof text !== "string" || !text.trim()) {
      return c.json({ error: "Введите текст для озвучки." }, 400)
    }
    if (text.length > 5000) {
      return c.json({ error: "Текст слишком длинный. Максимум 5000 символов." }, 400)
    }

    // XTTS-v2 exact fields from Replicate schema
    const input: Record<string, unknown> = {
      text: text.trim(),
      language: "ru",
      cleanup_voice: true,
    }
    // speaker = URL of user-uploaded audio for voice cloning
    if (speaker && typeof speaker === "string") {
      input.speaker = speaker
    }

    console.log(`[Audio] XTTS input: text="${text.trim().slice(0, 60)}...", speaker=${speaker ? "yes" : "no"}`)

    const response = await fetchWithTimeout(REPLICATE_PREDICTIONS, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ version: XTTS_VERSION, input }),
    }, TIMEOUT_MS)

    console.log(`[Audio] XTTS Replicate: ${response.status} in ${Date.now() - t0}ms`)

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Audio] XTTS error: ${errText}`)
      return c.json({ error: "Озвучка не удалась.", detail: errText }, 500)
    }

    const data = await response.json() as { id: string; status: string }
    console.log(`[Audio] XTTS prediction: id=${data.id} status=${data.status}`)

    return c.json({
      id: data.id,
      status: "processing",
      type: "voice",
      text: text.trim(),
    })
  } catch (error) {
    console.error(`[Audio] XTTS error after ${Date.now() - t0}ms:`, error)
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes("TIMEOUT")) return c.json({ error: "Сервис не отвечает." }, 504)
    return c.json({ error: "Озвучка не удалась." }, 500)
  }
})

// ─── GET /status/:id — universal poll for any audio prediction ───
audioRoutes.get("/status/:id", async (c) => {
  const predictionId = c.req.param("id")
  console.log(`[Audio] GET /status/${predictionId}`)

  try {
    const apiToken = getApiToken()
    if (!apiToken) return c.json({ error: "Service not configured." }, 503)

    const response = await fetchWithTimeout(`${REPLICATE_PREDICTIONS}/${predictionId}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${apiToken}` },
    }, TIMEOUT_MS)

    if (!response.ok) {
      console.error(`[Audio] Status error: ${response.status}`)
      return c.json({ id: predictionId, status: "processing" })
    }

    const data = await response.json() as {
      id: string
      status: string
      output?: string | string[] | { url: string }
      error?: string
    }

    console.log(`[Audio] Status ${predictionId}: ${data.status}`)

    if (data.status === "succeeded" && data.output) {
      let url: string | null = null
      if (typeof data.output === "string") url = data.output
      else if (Array.isArray(data.output)) url = data.output[0]
      else if (typeof data.output === "object" && "url" in data.output) url = data.output.url

      if (url) {
        return c.json({ id: predictionId, status: "completed", url })
      }
    }

    if (data.status === "failed" || data.status === "canceled") {
      return c.json({ id: predictionId, status: "failed", error: data.error || "Генерация не удалась." })
    }

    return c.json({ id: predictionId, status: "processing" })
  } catch (err) {
    console.error(`[Audio] Status check error:`, err)
    return c.json({ id: predictionId, status: "processing" })
  }
})

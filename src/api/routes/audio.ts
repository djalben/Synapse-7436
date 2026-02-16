import { Hono } from "hono"

export const audioRoutes = new Hono()

const REPLICATE_API = "https://api.replicate.com/v1"
const REPLICATE_PREDICTIONS = `${REPLICATE_API}/predictions`
const MINIMAX_MODEL = "minimax/music-01"      // Top-tier vocal+music generation
const XTTS_VERSION = "684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e"

// ─── Budget-based timeouts (total must stay under Vercel 10s) ───
const TOTAL_BUDGET_MS = 8000   // hard ceiling for the whole handler
const LLM_TIMEOUT_MS  = 4000  // GPT-4o-mini lyrics step
const POLL_TIMEOUT_MS  = 5000 // status check timeout

// Genre → style prompt for minimax
const GENRE_PROMPTS: Record<string, string> = {
  "Поп":         "upbeat pop song, catchy melody, modern production, polished vocals",
  "Электроника": "electronic dance track, driving synths, energetic beat, pulsing bass",
  "Хип-Хоп":    "hip-hop track, rhythmic flow, 808 bass, trap hi-hats, bold delivery",
  "Классика":    "classical-inspired piece, orchestral arrangement, elegant strings",
  "Рок":         "rock song, electric guitars, powerful drums, raw energy, distortion",
  "Джаз":        "jazz piece, smooth saxophone, swing rhythm, groovy walking bass",
  "Эмбиент":     "ambient soundscape, atmospheric pads, ethereal, dreamy textures",
}

function getApiToken(): string | undefined {
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

// ─── Generate song lyrics via GPT-4o-mini (fast, with fallback) ───
async function generateLyrics(
  keywords: string,
  genre: string,
  durationSec: number,
  timeoutMs: number = LLM_TIMEOUT_MS
): Promise<string> {
  const key = getOpenRouterKey()
  if (!key) {
    console.warn("[Audio] No OPENROUTER_API_KEY — using keywords as lyrics")
    return keywords
  }

  const structure =
    durationSec <= 30
      ? "1 short verse (4-6 lines)"
      : durationSec <= 60
        ? "1 verse + 1 chorus (8-12 lines total)"
        : "2 verses + 1 chorus + 1 bridge (16-20 lines total)"

  const maxChars = 400  // minimax/music-01 lyrics limit

  try {
    const res = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          max_tokens: 300,
          temperature: 0.9,
          messages: [
            {
              role: "system",
              content: `You are a professional hit songwriter. Write song lyrics in English.\nGenre: ${genre || "pop"}\nStructure: ${structure}\nRules:\n- Use section tags on separate lines: [verse], [chorus], [bridge]\n- Keep total lyrics UNDER ${maxChars} characters\n- Make lyrics catchy, emotional, and easy to sing\n- Use vivid imagery and a memorable hook in the chorus\n- Output ONLY the lyrics text, no title, no explanations`,
            },
            { role: "user", content: `Write a song about: ${keywords}` },
          ],
        }),
      },
      timeoutMs
    )

    if (!res.ok) {
      console.error(`[Audio] Lyrics LLM status=${res.status}`)
      return keywords
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const lyrics = data?.choices?.[0]?.message?.content?.trim()
    if (!lyrics) return keywords
    return lyrics.slice(0, maxChars)
  } catch (err) {
    console.error("[Audio] Lyrics generation failed (fallback to keywords):", err instanceof Error ? err.message : err)
    return keywords  // fallback: raw keywords become lyrics
  }
}

// ─── POST /generate — 2-step async: GPT lyrics → minimax fire-and-forget ───
// Also aliased as /music for backward compat
const generateHandler = async (c: { req: { json: () => Promise<any> }; json: (data: any, status?: number) => Response }) => {
  const t0 = Date.now()
  const elapsed = () => Date.now() - t0

  try {
    const apiToken = getApiToken()
    if (!apiToken) return c.json({ error: "Сервис аудио не настроен (REPLICATE_API_TOKEN)." }, 503)

    const { prompt, duration, genre } = await c.req.json()
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Опишите тему вашей песни." }, 400)
    }

    const genreName: string = genre || "Поп"
    const durationSec = Math.min(Math.max(duration || 60, 30), 120)
    const stylePrompt = GENRE_PROMPTS[genreName] || GENRE_PROMPTS["Поп"]!

    // ── Step 1: Generate lyrics via GPT-4o-mini (budget: 4s, fallback: raw keywords) ──
    console.log(`[Audio] Step 1/2 — GPT lyrics: keywords="${prompt.trim().slice(0, 50)}" genre=${genreName} dur=${durationSec}s`)
    const lyricsTimeout = Math.min(LLM_TIMEOUT_MS, TOTAL_BUDGET_MS - elapsed() - 2000)
    const lyrics = await generateLyrics(prompt.trim(), genreName, durationSec, Math.max(lyricsTimeout, 2000))
    console.log(`[Audio] Lyrics OK: ${lyrics.length}c in ${elapsed()}ms`)

    // ── Step 2: Fire minimax/music-01 prediction (budget: remaining, min 2s) ──
    const fireTimeout = Math.max(2000, TOTAL_BUDGET_MS - elapsed() - 500)
    const input: Record<string, unknown> = {
      prompt: stylePrompt,
      lyrics,
    }

    console.log(`[Audio] Step 2/2 — ${MINIMAX_MODEL}: style="${stylePrompt.slice(0, 40)}" lyrics=${lyrics.length}c timeout=${fireTimeout}ms`)

    const response = await fetchWithTimeout(
      `${REPLICATE_API}/models/${MINIMAX_MODEL}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          Prefer: "respond-async",
        },
        body: JSON.stringify({ input }),
      },
      fireTimeout
    )

    const responseText = await response.text()
    console.log(`[Audio] Replicate ${response.status} in ${elapsed()}ms: ${responseText.slice(0, 200)}`)

    if (!response.ok) {
      console.error(`[Audio] Replicate error body: ${responseText}`)
      return c.json({ error: "Генерация музыки не удалась.", detail: responseText.slice(0, 300) }, 500)
    }

    let data: { id?: string; status?: string }
    try {
      data = JSON.parse(responseText)
    } catch {
      console.error(`[Audio] Cannot parse Replicate response`)
      return c.json({ error: "Ошибка ответа сервиса." }, 500)
    }

    if (!data.id) {
      console.error(`[Audio] No prediction ID in response`)
      return c.json({ error: "Не получен ID задачи." }, 500)
    }

    console.log(`[Audio] ✓ Prediction ${data.id} (${data.status}) — total ${elapsed()}ms`)

    return c.json({
      id: data.id,
      status: "processing",
      type: "music",
      lyrics,
      prompt: prompt.trim(),
      duration: durationSec,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[Audio] GENERATE FAILED after ${elapsed()}ms: ${msg}`)
    if (msg.includes("TIMEOUT")) return c.json({ error: "Сервис не отвечает. Попробуйте снова." }, 504)
    return c.json({ error: "Генерация не удалась. Попробуйте снова." }, 500)
  }
}

audioRoutes.post("/generate", (c) => generateHandler(c as any))
audioRoutes.post("/music", (c) => generateHandler(c as any))

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
    }, POLL_TIMEOUT_MS)

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
    }, POLL_TIMEOUT_MS)

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

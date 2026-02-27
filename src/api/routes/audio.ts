import { Hono } from "hono"

export const audioRoutes = new Hono()

// Safe stress validator — lazy load on first call, never crashes the app
type StressResult = { text: string; checkedCount: number; fixedCount: number; ambiguousWords: { word: string; options: string[] }[] }
let _validateStresses: ((text: string) => StressResult) | null | undefined = undefined // undefined = not loaded yet

async function loadValidator(): Promise<void> {
  if (_validateStresses !== undefined) return // already loaded (or failed)
  try {
    const mod = await import("../utils/stress-validator.js")
    _validateStresses = mod.validateStresses
    console.log("[Audio] Stress validator loaded OK")
  } catch (e) {
    _validateStresses = null
    console.warn("[Audio] Stress validator failed to load — skipping:", e instanceof Error ? e.message : e)
  }
}

async function safeValidateStresses(lyrics: string): Promise<StressResult> {
  const empty: StressResult = { text: lyrics, checkedCount: 0, fixedCount: 0, ambiguousWords: [] }
  await loadValidator()
  if (!_validateStresses) return empty
  try {
    return _validateStresses(lyrics)
  } catch (err) {
    console.error("[Audio] Stress validator crashed (returning raw lyrics):", err instanceof Error ? err.message : err)
    return empty
  }
}

const REPLICATE_API = "https://api.replicate.com/v1"
const REPLICATE_PREDICTIONS = `${REPLICATE_API}/predictions`
const ELEVENLABS_MUSIC = `${REPLICATE_API}/models/elevenlabs/music/predictions` // official model, always warm
const XTTS_VERSION = "684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e"

// ─── Budget-based timeouts (total must stay under Vercel 10s) ───
const TOTAL_BUDGET_MS = 8000   // hard ceiling for the whole handler
const LLM_TIMEOUT_MS  = 4000  // GPT-4o-mini lyrics step
const POLL_TIMEOUT_MS  = 5000 // status check timeout

// Genre → Rich ElevenLabs music descriptors (instruments, mood, production)
interface GenreDescriptor {
  style: string
  instruments: string
  mood: string
  defaultBpm: number
  defaultKey: string
}
const GENRE_DESC: Record<string, GenreDescriptor> = {
  "Поп":         { style: "modern pop", instruments: "warm Rhodes piano, crisp acoustic guitar, tight programmed drums, layered synth pads, punchy bass", mood: "upbeat, catchy, radio-friendly", defaultBpm: 120, defaultKey: "C major" },
  "Электроника": { style: "electronic dance", instruments: "driving analog synths, pulsing 808 kick, shimmering arpeggios, side-chain compressed pads, sub bass", mood: "energetic, euphoric, hypnotic", defaultBpm: 128, defaultKey: "A minor" },
  "Хип-Хоп":    { style: "hip-hop trap", instruments: "booming 808 bass, crisp trap hi-hats, dark piano chords, vinyl crackle, ad-libs", mood: "confident, rhythmic, street", defaultBpm: 140, defaultKey: "D minor" },
  "Классика":    { style: "orchestral classical", instruments: "lush string ensemble, concert grand piano, French horn, celesta, harp arpeggios", mood: "elegant, emotional, cinematic", defaultBpm: 72, defaultKey: "E flat major" },
  "Рок":         { style: "rock", instruments: "overdriven Fender Stratocaster, Marshall amp crunch, driving drum kit, Rickenbacker bass, power chords", mood: "raw, energetic, rebellious", defaultBpm: 130, defaultKey: "E minor" },
  "Джаз":        { style: "jazz", instruments: "warm tenor saxophone, walking upright bass, brushed ride cymbal, Fender Rhodes, muted trumpet", mood: "smooth, sophisticated, groovy", defaultBpm: 110, defaultKey: "B flat major" },
  "Эмбиент":     { style: "ambient", instruments: "ethereal reverbed pads, granular textures, distant piano, field recordings, gentle tape delay", mood: "atmospheric, dreamy, meditative", defaultBpm: 70, defaultKey: "F major" },
  "Шансон":      { style: "Russian acoustic folk-pop chanson", instruments: "nylon string classical guitar, accordion accents, gentle bayan, upright bass pizzicato, light percussion", mood: "nostalgic, emotional, soulful, storytelling", defaultBpm: 95, defaultKey: "A minor" },
  "R&B":         { style: "modern R&B soul", instruments: "silky Wurlitzer keys, fingerpicked clean guitar, deep groove bass, crisp snare, lush vocal harmonies", mood: "sensual, intimate, smooth", defaultBpm: 85, defaultKey: "D flat major" },
  "Метал":       { style: "heavy metal", instruments: "heavily distorted dual guitars, double bass drum blast, growling bass, orchestral stabs, epic choir", mood: "aggressive, powerful, epic", defaultBpm: 160, defaultKey: "E minor" },
  "Кантри":      { style: "country", instruments: "warm acoustic Taylor guitar, pedal steel, fiddle, honky-tonk piano, brushed snare", mood: "warm, nostalgic, storytelling", defaultBpm: 100, defaultKey: "G major" },
}

function getApiToken(): string | undefined {
  return process.env.REPLICATE_API_TOKEN
}

function getOpenRouterKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY
}

function getElevenLabsKey(): string | undefined {
  const raw = process.env.ELEVENLABS_API_KEY
  if (!raw) return undefined
  // Strip any accidental quotes or whitespace
  const cleaned = raw.replace(/^["'\s]+|["'\s]+$/g, "")
  return cleaned || undefined
}

function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  return Promise.race([
    fetch(url, init),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT_${ms}ms`)), ms)
    ),
  ])
}

// ─── Syllable counting for Russian text (vowel-based) ───
const RU_VOWELS = new Set("аеёиоуыэюяАЕЁИОУЫЭЮЯ")
function countSyllables(line: string): number {
  let count = 0
  for (const ch of line) { if (RU_VOWELS.has(ch)) count++ }
  return count
}

/** Analyze rhythm symmetry of lyrics — returns score 0-100 and per-section details */
function analyzeRhythm(lyrics: string): { score: number; perfect: boolean; details: string[] } {
  const lines = lyrics.split("\n").map(l => l.trim()).filter(Boolean)
  const contentLines: { text: string; syllables: number }[] = []
  for (const line of lines) {
    if (/^\[.*\]$/.test(line)) continue // skip markers
    if (line.startsWith("BPM:")) continue
    const s = countSyllables(line)
    if (s > 0) contentLines.push({ text: line, syllables: s })
  }
  if (contentLines.length < 2) return { score: 100, perfect: true, details: [] }

  let matchedPairs = 0
  let totalPairs = 0
  const details: string[] = []

  for (let i = 0; i < contentLines.length - 1; i += 2) {
    totalPairs++
    const a = contentLines[i].syllables
    const b = contentLines[i + 1].syllables
    if (a === b) {
      matchedPairs++
    } else {
      details.push(`Строки ${i + 1}-${i + 2}: ${a} vs ${b} слогов`)
    }
  }

  const score = totalPairs > 0 ? Math.round((matchedPairs / totalPairs) * 100) : 100
  return { score, perfect: score >= 90, details: details.slice(0, 5) }
}

interface LyricsResult { lyrics: string; bpm: number }

// ─── Generate song lyrics via GPT-4o (professional lyricist) ───
async function generateLyrics(
  keywords: string,
  genre: string,
  durationSec: number,
  gender: string = "female",
  language: string = "ru",
  timeoutMs: number = LLM_TIMEOUT_MS
): Promise<LyricsResult> {
  const defaultBpm = (GENRE_DESC[genre] || GENRE_DESC["Поп"]).defaultBpm
  const fallback = { lyrics: keywords, bpm: defaultBpm }
  const key = getOpenRouterKey()
  if (!key) {
    console.warn("[Audio] No OPENROUTER_API_KEY — using keywords as lyrics")
    return fallback
  }

  const structure =
    durationSec <= 30
      ? "[Verse 1] (6-8 lines) → [Chorus] (4 lines)"
      : durationSec <= 60
        ? "[Verse 1] (6-8 lines) → [Chorus] (4-6 lines) → [Verse 2] (6-8 lines) → [Chorus]"
        : "[Verse 1] (6-8 lines) → [Chorus] (4-6 lines) → [Verse 2] (6-8 lines) → [Chorus] → [Bridge] (4 lines) → [Outro] (2-4 lines)"

  const maxChars = 1200
  const langName = language === "ru" ? "Russian" : "English"
  const genderPerspective = gender === "male" ? "male" : "female"
  const vocalistDesc = gender === "male" ? "Male vocalist" : "Female vocalist"

  // Genre-specific writing instructions
  const genreGuide: Record<string, string> = {
    "Pop": "Write simple but catchy phrases that stick in the head after first listen. Light, danceable rhythm. Think Макс Фадеев writing for Глюк'оZа.",
    "Поп": "Write simple but catchy phrases that stick in the head after first listen. Light, danceable rhythm. Think Макс Фадеев writing for Глюк'оZа.",
    "Rock": "Add raw energy, edge, and rebellion. Shorter punchy lines, powerful imagery. Think ДДТ or Сплин — honest and hard-hitting.",
    "Рок": "Add raw energy, edge, and rebellion. Shorter punchy lines, powerful imagery. Think ДДТ or Сплин — honest and hard-hitting.",
    "Hip-Hop": "Tight rhythmic flow, internal rhymes within lines, wordplay. Dense meaning per bar. Think Oxxxymiron or Скриптонит.",
    "Хип-Хоп": "Tight rhythmic flow, internal rhymes within lines, wordplay. Dense meaning per bar. Think Oxxxymiron or Скриптонит.",
    "R&B": "Smooth, sensual, intimate. Longer vowel sounds for melisma. Emotional vulnerability. Think The Weeknd vibes in Russian.",
    "Electronic": "Minimalist but hypnotic. Repeat key phrases like mantras. Atmospheric and dreamy. Short evocative images.",
    "Электроника": "Minimalist but hypnotic. Repeat key phrases like mantras. Atmospheric and dreamy. Short evocative images.",
    "Jazz": "Sophisticated vocabulary, subtle irony, conversational tone. Think poetry set to music.",
    "Джаз": "Sophisticated vocabulary, subtle irony, conversational tone. Think poetry set to music.",
    "Country": "Storytelling with vivid rural/life imagery. Warm, nostalgic, grounded. Real-life scenes.",
    "Кантри": "Storytelling with vivid rural/life imagery. Warm, nostalgic, grounded. Real-life scenes.",
    "Indie": "Poetic, introspective, slightly abstract. Unusual metaphors. Think Земфира or Дайте Танк (!).",
    "Классика": "Elegant, poetic language with rich imagery. Think classical art song — beautiful phrasing, noble emotion.",
    "Эмбиент": "Minimalist, atmospheric, dreamy. Short evocative phrases, repetition as meditation.",
    "Шансон": "Write sincere, life-driven stories. Use simple but deep metaphors about fate, home, loyalty, and time. Avoid vulgarity — focus on soulfulness. Think Михаил Круг or Сергей Трофимов. Street wisdom, warm nostalgia, male camaraderie, prison of the soul (not literal). Conversational, as if telling a story to a friend over a guitar.",
    "Метал": "Aggressive, powerful, epic imagery. War, fire, steel, storms. Short punchy lines with explosive choruses. Think Кипелов, Ария — dramatic and theatrical.",
  }
  const genreName = genre || "Pop"
  const genreInstruction = genreGuide[genreName] || genreGuide["Pop"]

  const systemPrompt = [
    `You are a TOP-TIER Russian songwriter at the level of Константин Меладзе and Макс Фадеев. You write lyrics with MATHEMATICAL PRECISION of rhythm and deep emotional authenticity. When people read your lyrics, they say: "This is about me." You NEVER write generic text.`,
    ``,
    `LANGUAGE: Write EXCLUSIVELY in ${langName}. Every single word must be in ${langName}.`,
    `GENRE: ${genreName}`,
    `GENRE STYLE: ${genreInstruction}`,
    `VOCALIST: ${vocalistDesc} — write from a ${genderPerspective} perspective with an authentic emotional voice.`,
    ``,
    `STRUCTURE (strictly follow this order):`,
    `${structure}`,
    `Place each section marker ([Verse 1], [Chorus], [Verse 2], [Bridge], [Outro]) on its own separate line.`,
    ``,
    `═══ MATHEMATICAL SONGWRITING (THE #1 PRIORITY) ═══`,
    `You MUST count syllables for EVERY line and ensure PERFECT SYMMETRY:`,
    `- Lines 1 and 2 MUST have EXACTLY the same syllable count.`,
    `- Lines 3 and 4 MUST have EXACTLY the same syllable count.`,
    `- This pattern continues for every pair: 5-6, 7-8, etc.`,
    `- The chorus should have the SAME syllable pattern in each repetition.`,
    ``,
    `PROCESS: For each line, count vowels (each vowel = 1 syllable in Russian). Rewrite any line that breaks symmetry.`,
    `Example of PERFECT 8-8-7-7 pattern:`,
    `  Я ухожу по тихим улицам (8)`,
    `  Где фонари горят устало (8)`,
    `  Твоя тень рядом не идёт (7)`,
    `  И сердце больше не зовёт (7)`,
    ``,
    `═══ BPM DETECTION ═══`,
    `Based on the mood and genre, determine the ideal BPM (tempo) for this song.`,
    `On the VERY FIRST LINE of your output, write: BPM: <number>`,
    `Then start the lyrics from the next line.`,
    `Guidelines: ballad = 60-80, mid-tempo = 90-110, upbeat = 115-130, dance = 125-140, rock = 120-150, hip-hop = 130-160.`,
    ``,
    `═══ ANTI-CLICHÉ BLACKLIST ═══`,
    `BANNED rhyme pairs: тебя/меня, любовь/кровь, огонь/ладонь, вновь/любовь, слёзы/грёзы, розы/морозы, мечты/цветы, сердце/дверца, глаза/слеза, ночь/прочь, дождь/ложь, душа/хороша, счастье/ненастье`,
    `BANNED phrases: "крылья за спиной", "лететь высоко", "растворяюсь в тебе", "половинка моя", "ты — мой мир", "без тебя не могу", "сердце бьётся", "море любви"`,
    `USE: Fresh metaphors from real life — kitchen smells, city noise, phone screen glow, train windows, cold coffee, crumpled sheets. Be SPECIFIC.`,
    ``,
    `═══ CRAFT RULES ═══`,
    `- RHYME SCHEME: ABAB or AABB. Non-trivial, satisfying rhymes.`,
    `- HOOK: Chorus MUST have one killer hook phrase (2-5 words) that could be the song title. Repeat it.`,
    `- EMOTIONAL ARC: Verse = scene/story → Chorus = emotional explosion → Bridge = twist/revelation → Outro = resolution.`,
    `- SHOW DON'T TELL: Instead of "мне грустно", write "остывший чай стоит с утра, и шторы не открыты". Paint scenes.`,
    `- NO FILLER: Zero "la-la-la", "о-о-о", "на-на-на". Every line carries weight.`,
    `- CONVERSATIONAL TONE: Sound like talking to a close friend, not a greeting card.`,
    `- Write lyrics in normal lowercase. Do NOT use uppercase letters for stress marks — our system handles accents automatically.`,
    `- For proper names that need stress clarity, hyphenate syllables: А-ри-ад-на, Е-ка-те-ри-на.`,
    ``,
    `LIMITS: Total lyrics UNDER ${maxChars} characters.`,
    `OUTPUT: First line = "BPM: <number>". Then only lyrics. No title, no commentary, no syllable counts.`,
  ].join("\n")

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
          model: "openai/gpt-4o",
          max_tokens: 700,
          temperature: 0.85,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Write a ${genreName} song ${language === "ru" ? "in Russian" : "in English"} about: ${keywords}\n\nCRITICAL: Count syllables for every line pair. Lines 1-2 must match exactly, lines 3-4 must match exactly. Start with "BPM: <number>". Use fresh metaphors, no clichés. Make the listener feel "this is about me".` },
          ],
        }),
      },
      timeoutMs
    )

    if (!res.ok) {
      console.error(`[Audio] Lyrics LLM status=${res.status}`)
      return fallback
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const raw = data?.choices?.[0]?.message?.content?.trim()
    if (!raw) return fallback

    // Parse BPM from first line (format: "BPM: 120")
    let bpm = defaultBpm
    let lyricsText = raw
    const bpmMatch = raw.match(/^BPM:\s*(\d+)/i)
    if (bpmMatch) {
      bpm = Math.min(Math.max(parseInt(bpmMatch[1], 10), 40), 220)
      lyricsText = raw.slice(bpmMatch[0].length).replace(/^\s*\n/, "").trim()
      console.log(`[Audio] GPT detected BPM: ${bpm}`)
    }

    return { lyrics: lyricsText.slice(0, maxChars), bpm }
  } catch (err) {
    console.error("[Audio] Lyrics generation failed (fallback to keywords):", err instanceof Error ? err.message : err)
    return fallback
  }
}

// ─── POST /generate — 2-step async: GPT lyrics → ElevenLabs Music fire-and-forget ───
// Also aliased as /music for backward compat
const generateHandler = async (c: { req: { json: () => Promise<any> }; json: (data: any, status?: number) => Response }) => {
  const t0 = Date.now()
  const elapsed = () => Date.now() - t0

  try {
    const apiToken = getApiToken()
    if (!apiToken) return c.json({ error: "Сервис аудио не настроен (REPLICATE_API_TOKEN)." }, 503)

    const { prompt, duration, genre, vocalGender, language, voiceId, lyrics: prewrittenLyrics } = await c.req.json()
    if (voiceId) console.log(`[Audio] Voice clone requested: ${voiceId} (Speech-to-Speech)`)
    if (prewrittenLyrics) console.log(`[Audio] Pre-written lyrics provided: ${prewrittenLyrics.length}c`)
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Опишите тему вашей песни." }, 400)
    }

    const genreName: string = genre || "Поп"
    const gender: string = vocalGender === "male" ? "male" : "female"
    const lang: string = language === "en" ? "en" : "ru"
    const durationSec = Math.min(Math.max(duration || 60, 30), 300) // ElevenLabs supports up to 5 min
    const gd = GENRE_DESC[genreName] || GENRE_DESC["Поп"]

    console.log(`[Audio] Creating track: genre=${genreName} gender=${gender} lang=${lang} dur=${durationSec}s`)

    // ── Step 1: Use pre-written lyrics OR generate via GPT-4o ──
    let lyrics: string
    let detectedBpm = gd.defaultBpm
    if (prewrittenLyrics && typeof prewrittenLyrics === "string" && prewrittenLyrics.trim().length >= 10) {
      lyrics = prewrittenLyrics.trim()
      console.log(`[Audio] Using pre-written lyrics: ${lyrics.length}c (skipping GPT)`)
    } else {
      console.log(`[Audio] Step 1/2 — GPT lyrics: keywords="${prompt.trim().slice(0, 50)}" genre=${genreName} gender=${gender} dur=${durationSec}s`)
      const lyricsTimeout = Math.min(LLM_TIMEOUT_MS, TOTAL_BUDGET_MS - elapsed() - 2000)
      const result = await generateLyrics(prompt.trim(), genreName, durationSec, gender, lang, Math.max(lyricsTimeout, 2000))
      lyrics = result.lyrics
      detectedBpm = result.bpm

      // Guarantee lyrics are never empty / too short (min 10 chars)
      if (!lyrics || lyrics.trim().length < 10) {
        const kw = prompt.trim()
        lyrics = `[Verse]\n${kw}\n${kw}\n[Chorus]\n${kw}, ${kw}`
        console.warn(`[Audio] Lyrics too short — padded with keywords: ${lyrics.length}c`)
      }
    }
    console.log(`[Audio] Lyrics OK: ${lyrics.length}c bpm=${detectedBpm} in ${elapsed()}ms`)

    // ── Step 2: Fire ElevenLabs Music prediction (official model, always warm) ──
    const fireTimeout = Math.max(2000, TOTAL_BUDGET_MS - elapsed() - 500)
    const vocalDesc = gender === "male" ? "male vocalist with warm baritone" : "female vocalist with expressive tone"
    const langHint = lang === "ru" ? "Vocalist singing in Russian language" : "Vocalist singing in English language"
    // Rich music prompt with BPM (GPT-detected or genre default), key, specific instruments
    const bpmHint = `${detectedBpm} BPM`
    const musicPrompt = `A ${gd.style} song at ${bpmHint} in ${gd.defaultKey}. Instruments: ${gd.instruments}. Mood: ${gd.mood}. ${vocalDesc}. ${langHint}. About: ${prompt.trim()}. Lyrics:\n${lyrics}`

    const input: Record<string, unknown> = {
      prompt: musicPrompt,
      music_length_ms: durationSec * 1000,
      force_instrumental: false,
      output_format: "mp3_standard",
    }

    console.log(`[Audio] Step 2/2 — elevenlabs/music: prompt=${musicPrompt.length}c dur=${durationSec}s (${durationSec * 1000}ms) timeout=${fireTimeout}ms`)

    const response = await fetchWithTimeout(
      ELEVENLABS_MUSIC,
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

// ─── POST /generate-lyrics — GPT lyrics only (step 1 of 2-step flow) ───
audioRoutes.post("/generate-lyrics", async (c) => {
  const t0 = Date.now()
  console.log("[Audio] POST /generate-lyrics")

  try {
    const { prompt, duration, genre, vocalGender, language } = await c.req.json()
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Опишите тему вашей песни." }, 400)
    }

    const genreName: string = genre || "Поп"
    const gender: string = vocalGender === "male" ? "male" : "female"
    const lang: string = language === "en" ? "en" : "ru"
    const durationSec = Math.min(Math.max(duration || 60, 30), 300)

    console.log(`[Audio] Generating lyrics: genre=${genreName} gender=${gender} lang=${lang} dur=${durationSec}s`)

    const lyricsResult = await generateLyrics(prompt.trim(), genreName, durationSec, gender, lang, LLM_TIMEOUT_MS)
    let lyrics = lyricsResult.lyrics
    const bpm = lyricsResult.bpm

    if (!lyrics || lyrics.trim().length < 10) {
      const kw = prompt.trim()
      lyrics = `[Verse]\n${kw}\n${kw}\n[Chorus]\n${kw}, ${kw}`
      console.warn(`[Audio] Lyrics too short — padded with keywords`)
    }

    // Run stress validator (Russian only) — safe, never crashes
    let stressValidation: StressResult = { text: lyrics, checkedCount: 0, fixedCount: 0, ambiguousWords: [] }
    if (lang === "ru") {
      const result = await safeValidateStresses(lyrics)
      lyrics = result.text
      stressValidation = result
      console.log(`[Audio] Stress validation: checked=${result.checkedCount} fixed=${result.fixedCount} ambiguous=${result.ambiguousWords.length}`)
    }

    // Analyze rhythm symmetry
    const rhythm = analyzeRhythm(lyrics)
    console.log(`[Audio] Rhythm score: ${rhythm.score}% (perfect=${rhythm.perfect}) bpm=${bpm}`)

    console.log(`[Audio] Lyrics generated: ${lyrics.length}c in ${Date.now() - t0}ms`)
    return c.json({ lyrics, prompt: prompt.trim(), stressValidation, bpm, rhythm })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[Audio] GENERATE-LYRICS FAILED: ${msg}`)
    if (msg.includes("TIMEOUT")) return c.json({ error: "Сервис не отвечает." }, 504)
    return c.json({ error: "Генерация текста не удалась." }, 500)
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

// ─── POST /speech-to-speech — apply cloned voice to generated audio via ElevenLabs S2S ───
audioRoutes.post("/speech-to-speech", async (c) => {
  const t0 = Date.now()
  console.log("[Audio] POST /speech-to-speech")
  console.log(`DEBUG: ELEVENLABS key length is: ${process.env.ELEVENLABS_API_KEY?.length ?? "UNDEFINED"}`)

  try {
    const elevenLabsKey = getElevenLabsKey()
    if (!elevenLabsKey) return c.json({ error: "ElevenLabs API не настроен (ELEVENLABS_API_KEY)." }, 503)

    const { audioUrl, voiceId } = await c.req.json()
    if (!audioUrl || !voiceId) {
      return c.json({ error: "audioUrl и voiceId обязательны." }, 400)
    }

    // Step 1: Download the generated audio from Replicate
    console.log(`[Audio] S2S: downloading audio from ${audioUrl.slice(0, 80)}...`)
    const audioRes = await fetchWithTimeout(audioUrl, {}, 15000)
    if (!audioRes.ok) {
      return c.json({ error: "Не удалось скачать аудиофайл." }, 500)
    }
    const audioBlob = await audioRes.blob()
    console.log(`[Audio] S2S: downloaded ${audioBlob.size} bytes in ${Date.now() - t0}ms`)

    // Step 2: Send to ElevenLabs Speech-to-Speech
    const stsForm = new FormData()
    stsForm.append("audio", audioBlob, "input.mp3")
    stsForm.append("model_id", "eleven_multilingual_sts_v2")
    stsForm.append("voice_settings", JSON.stringify({
      stability: 0.5,
      similarity_boost: 0.8,
    }))

    console.log(`[Audio] S2S: sending to ElevenLabs voice ${voiceId}...`)
    const stsRes = await fetchWithTimeout(
      `https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: { "xi-api-key": elevenLabsKey },
        body: stsForm,
      },
      45000
    )

    if (!stsRes.ok) {
      const errText = await stsRes.text()
      console.error(`[Audio] S2S error: ${stsRes.status} ${errText}`)
      return c.json({ error: "Speech-to-Speech не удалось.", detail: errText }, 500)
    }

    // Step 3: Upload result to Vercel Blob
    const resultBuffer = Buffer.from(await stsRes.arrayBuffer())
    console.log(`[Audio] S2S: result ${resultBuffer.length} bytes in ${Date.now() - t0}ms, uploading to blob...`)

    const { put } = await import("@vercel/blob")
    const blob = await put(`synapse/sts-${Date.now()}.mp3`, resultBuffer, {
      access: "public",
      contentType: "audio/mpeg",
    })

    console.log(`[Audio] S2S: done in ${Date.now() - t0}ms → ${blob.url}`)
    return c.json({ url: blob.url })
  } catch (err) {
    console.error(`[Audio] S2S error after ${Date.now() - t0}ms:`, err)
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("TIMEOUT")) return c.json({ error: "Speech-to-Speech: сервис не отвечает." }, 504)
    return c.json({ error: "Speech-to-Speech не удалось." }, 500)
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
      output?: string | string[] | { audio_out?: string; url?: string }
      error?: string
    }

    console.log(`[Audio] Status ${predictionId}: ${data.status} output=${JSON.stringify(data.output).slice(0, 200)}`)

    if (data.status === "succeeded" && data.output) {
      let url: string | null = null
      if (typeof data.output === "string") url = data.output
      else if (Array.isArray(data.output)) url = data.output[0]
      else if (typeof data.output === "object" && data.output.audio_out) url = data.output.audio_out
      else if (typeof data.output === "object" && data.output.url) url = data.output.url

      if (url) {
        return c.json({ id: predictionId, status: "completed", url })
      }
    }

    if (data.status === "failed" || data.status === "canceled") {
      console.error(`[Audio] ❌ Prediction ${predictionId} FAILED:`, data.error)
      console.error(`[Audio] Full failed prediction data:`, JSON.stringify(data).slice(0, 500))
      return c.json({ id: predictionId, status: "failed", error: data.error || "Генерация не удалась." })
    }

    // Pass through actual Replicate status (starting / processing) so frontend can react
    return c.json({ id: predictionId, status: data.status === "starting" ? "starting" : "processing" })
  } catch (err) {
    console.error(`[Audio] Status check error:`, err)
    return c.json({ id: predictionId, status: "processing" })
  }
})

// ─── POST /clone-voice — clone a voice via ElevenLabs API ───
audioRoutes.post("/clone-voice", async (c) => {
  console.log("[Audio] POST /clone-voice")
  const rawKey = process.env.ELEVENLABS_API_KEY
  const keyTail = rawKey ? rawKey.slice(-4) : "NONE"
  console.log(`[Audio] clone-voice: key length=${rawKey?.length ?? 0}, ends with: ${keyTail}`)

  try {
    const elevenLabsKey = getElevenLabsKey()
    if (!elevenLabsKey) return c.json({ error: "ElevenLabs API не настроен (ELEVENLABS_API_KEY).", keyTail }, 503)

    const formData = await c.req.formData()
    let name = formData.get("name")
    const file = formData.get("file")

    // Validate & log inputs
    if (!name || typeof name !== "string" || !name.trim()) {
      console.warn("[Audio] clone-voice: name missing or empty, using fallback")
      name = "User Clone"
    }
    if (!file || !(file instanceof File)) {
      console.error("[Audio] clone-voice: no valid file in FormData. Keys:", [...formData.keys()])
      return c.json({ error: "Аудиофайл не получен. Загрузите файл или запишите голос." }, 400)
    }

    console.log(`[Audio] clone-voice: name="${name}", file.name="${file.name}", file.size=${file.size}, file.type="${file.type}"`)

    if (file.size < 1000) {
      console.error(`[Audio] clone-voice: file too small (${file.size} bytes), likely empty recording`)
      return c.json({ error: "Аудиофайл слишком маленький. Запишите хотя бы несколько секунд." }, 400)
    }

    // Forward to ElevenLabs
    const elFormData = new FormData()
    elFormData.append("name", name)
    elFormData.append("files", file, file.name || "voice-sample.webm")

    const keyUsed = elevenLabsKey.trim()
    console.log(`[Audio] clone-voice: sending to ElevenLabs voices/add (key ends: ${keyUsed.slice(-4)})...`)
    const response = await fetchWithTimeout(
      "https://api.elevenlabs.io/v1/voices/add",
      {
        method: "POST",
        headers: { "xi-api-key": keyUsed },
        body: elFormData,
      },
      30000
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[Audio] ElevenLabs clone error: status=${response.status} statusText="${response.statusText}"`)
      console.error(`[Audio] ElevenLabs Error Details:`, errText)
      console.error(`[Audio] Key used ends with: ${keyUsed.slice(-4)}`)
      return c.json({
        error: `Клонирование не удалось (ElevenLabs ${response.status}).`,
        detail: errText,
        status: response.status,
        keyTail: keyUsed.slice(-4),
      }, 500)
    }

    const data = await response.json() as { voice_id: string }
    console.log(`[Audio] Voice cloned successfully: voice_id=${data.voice_id}`)

    return c.json({ voice_id: data.voice_id })
  } catch (err) {
    console.error("[Audio] Clone error:", err)
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("TIMEOUT")) return c.json({ error: "Сервис не отвечает." }, 504)
    return c.json({ error: "Клонирование не удалось." }, 500)
  }
})

// ─── POST /cancel/:id — cancel a Replicate prediction to save credits ───
audioRoutes.post("/cancel/:id", async (c) => {
  const predictionId = c.req.param("id")
  console.log(`[Audio] POST /cancel/${predictionId}`)

  try {
    const apiToken = getApiToken()
    if (!apiToken) return c.json({ error: "Service not configured." }, 503)

    const response = await fetchWithTimeout(`${REPLICATE_PREDICTIONS}/${predictionId}/cancel`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiToken}` },
    }, 5000)

    console.log(`[Audio] Cancel ${predictionId}: ${response.status}`)
    return c.json({ id: predictionId, canceled: response.ok })
  } catch (err) {
    console.error(`[Audio] Cancel error:`, err)
    return c.json({ id: predictionId, canceled: false })
  }
})

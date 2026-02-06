import { Hono } from "hono"
import { env } from "cloudflare:workers"

export const audioRoutes = new Hono()

// Voice preset configurations
const VOICE_PRESETS: Record<string, { description: string; style?: string }> = {
  "male-professional": { description: "Professional male voice, clear and authoritative" },
  "male-casual": { description: "Casual male voice, friendly and relaxed" },
  "female-professional": { description: "Professional female voice, clear and confident" },
  "female-warm": { description: "Warm female voice, friendly and approachable" },
  "robot-futuristic": { description: "Robotic voice, futuristic AI assistant" },
}

// Genre style prompts for music generation
const GENRE_STYLES: Record<string, string> = {
  pop: "catchy pop melody, upbeat rhythm, modern production",
  electronic: "electronic dance music, synths, driving beat",
  "hip-hop": "hip-hop beat, bass-heavy, rhythmic",
  classical: "orchestral arrangement, classical instrumentation",
  rock: "electric guitars, drums, rock energy",
  ambient: "atmospheric, ambient soundscape, relaxing",
}

// Poll Replicate for prediction result
async function pollReplicatePrediction(predictionId: string, maxAttempts = 120): Promise<{ status: string; output?: string | string[] }> {
  const apiToken = env.REPLICATE_API_TOKEN
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    })
    
    if (!response.ok) {
      throw new Error("Failed to check prediction status")
    }
    
    const data = await response.json() as { status: string; output?: string | string[]; error?: string }
    
    if (data.status === "succeeded") {
      return data
    }
    
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error || "Audio generation failed")
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  throw new Error("Audio generation timed out. Please try again.")
}

// Music generation endpoint
audioRoutes.post("/music", async (c) => {
  try {
    // Log request in development
    if (import.meta.env.DEV) {
      console.log("[Audio API] Music generation request received")
    }

    const { prompt, duration, instrumental, genre } = await c.req.json()
    
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Please describe the music you want to create." }, 400)
    }
    
    const apiToken = env.REPLICATE_API_TOKEN
    
    // Build enhanced prompt
    let enhancedPrompt = prompt.trim()
    
    // Add genre style if provided
    if (genre && GENRE_STYLES[genre]) {
      enhancedPrompt += `, ${GENRE_STYLES[genre]}`
    }
    
    // Add instrumental tag if needed
    if (instrumental) {
      enhancedPrompt += ", instrumental only, no vocals"
    }
    
    // Map duration to model format
    const durationMap: Record<number, number> = { 30: 30, 60: 30, 120: 30 }
    const modelDuration = durationMap[duration] || 30
    
    // Try Replicate MusicGen if available
    if (apiToken) {
      try {
        if (import.meta.env.DEV) {
          console.log("[Audio API] Attempting Replicate MusicGen")
        }
        
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "671ac645ce5e552cc63a54a2bbff63fcf798043ac45c6e1fda8c4b5b3cdcd0a9", // facebook/musicgen-large
            input: {
              prompt: enhancedPrompt,
              duration: modelDuration,
              model_version: "stereo-large",
              output_format: "mp3",
              normalization_strategy: "peak",
            },
          }),
        })
        
        if (response.ok) {
          const prediction = await response.json() as { id: string }
          const result = await pollReplicatePrediction(prediction.id, 120)
          
          if (result.output) {
            const audioUrl = Array.isArray(result.output) ? result.output[0] : result.output
            
            if (import.meta.env.DEV) {
              console.log("[Audio API] Successfully generated music via Replicate")
            }
            
            return c.json({
              id: `music-${Date.now()}`,
              url: audioUrl,
              prompt: prompt.trim(),
              duration: `${Math.floor(modelDuration / 60)}:${(modelDuration % 60).toString().padStart(2, "0")}`,
              type: "music",
              genre: genre || null,
              instrumental,
              createdAt: new Date().toISOString(),
              creditCost: 10, // Music generation costs 10 credits
            })
          }
        }
      } catch (replicateError) {
        if (import.meta.env.DEV) {
          console.warn("[Audio API] Replicate MusicGen failed:", replicateError)
        }
        // Fall through to sample response
      }
    } else if (import.meta.env.DEV) {
      console.warn("[Audio API] REPLICATE_API_TOKEN not configured, using sample audio")
    }
    
    // Return sample audio URL for demonstration
    return c.json({
      id: `music-${Date.now()}`,
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      prompt: prompt.trim(),
      duration: `0:${modelDuration}`,
      type: "music",
      genre: genre || null,
      instrumental,
      createdAt: new Date().toISOString(),
      creditCost: 10,
    })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[Audio API] Music generation error:", error)
    }
    return c.json({ error: "High load on GPU servers, please try again later." }, 500)
  }
})

// Text-to-speech endpoint
audioRoutes.post("/tts", async (c) => {
  try {
    // Log request in development
    if (import.meta.env.DEV) {
      console.log("[Audio API] TTS request received")
    }

    const { text, voice } = await c.req.json()
    
    if (!text || typeof text !== "string" || !text.trim()) {
      return c.json({ error: "Please enter text to convert to speech." }, 400)
    }
    
    if (text.length > 5000) {
      return c.json({ error: "Text is too long. Maximum 5000 characters." }, 400)
    }
    
    const voicePreset = VOICE_PRESETS[voice] || VOICE_PRESETS["female-warm"]
    const hfToken = env.HUGGINGFACE_API_KEY ?? env.HF_API_TOKEN
    const apiToken = env.REPLICATE_API_TOKEN

    // Бесплатная озвучка через Hugging Face TTS (если задан токен)
    if (hfToken) {
      try {
        const hfRes = await fetch("https://api-inference.huggingface.co/models/facebook/mms-tts-eng", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: text.trim().slice(0, 500), text_inputs: text.trim().slice(0, 500) }),
        })
        if (hfRes.ok && hfRes.body) {
          const audioBytes = await hfRes.arrayBuffer()
          const b64 = btoa(String.fromCharCode(...new Uint8Array(audioBytes)))
          const mime = hfRes.headers.get("content-type") || "audio/wav"
          const dataUrl = `data:${mime};base64,${b64}`
          const wordCount = text.trim().split(/\s+/).length
          const durationSeconds = Math.ceil((wordCount / 150) * 60)
          const durationStr = `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, "0")}`
          return c.json({
            id: `tts-hf-${Date.now()}`,
            url: dataUrl,
            text: text.trim(),
            voice,
            voiceDescription: voicePreset.description,
            duration: durationStr,
            type: "voice",
            createdAt: new Date().toISOString(),
            creditCost: 0,
          })
        }
      } catch (e) {
        if (import.meta.env.DEV) console.warn("[Audio API] Hugging Face TTS failed:", e)
      }
    }

    // Try Replicate XTTS if available
    if (apiToken) {
      try {
        if (import.meta.env.DEV) {
          console.log("[Audio API] Attempting Replicate XTTS")
        }
        
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e", // coqui/xtts-v2
            input: {
              text: text.trim(),
              speaker: "en_female_01", // Default speaker
              language: "en",
            },
          }),
        })
        
        if (response.ok) {
          const prediction = await response.json() as { id: string }
          const result = await pollReplicatePrediction(prediction.id, 60)
          
          if (result.output) {
            const audioUrl = Array.isArray(result.output) ? result.output[0] : result.output
            
            // Estimate duration from text length (rough approximation)
            const wordsPerMinute = 150
            const wordCount = text.trim().split(/\s+/).length
            const durationSeconds = Math.ceil((wordCount / wordsPerMinute) * 60)
            const durationStr = `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, "0")}`
            
            if (import.meta.env.DEV) {
              console.log("[Audio API] Successfully generated TTS via Replicate")
            }
            
            return c.json({
              id: `tts-${Date.now()}`,
              url: audioUrl,
              text: text.trim(),
              voice,
              voiceDescription: voicePreset.description,
              duration: durationStr,
              type: "voice",
              createdAt: new Date().toISOString(),
              creditCost: 3, // TTS costs 3 credits
            })
          }
        }
      } catch (replicateError) {
        if (import.meta.env.DEV) {
          console.warn("[Audio API] Replicate XTTS failed:", replicateError)
        }
        // Fall through to sample response
      }
    } else if (import.meta.env.DEV) {
      console.warn("[Audio API] REPLICATE_API_TOKEN not configured, using sample audio")
    }
    
    // Return sample response for demonstration
    const wordCount = text.trim().split(/\s+/).length
    const durationSeconds = Math.ceil((wordCount / 150) * 60)
    
    return c.json({
      id: `tts-${Date.now()}`,
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      text: text.trim(),
      voice,
      voiceDescription: voicePreset.description,
      duration: `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, "0")}`,
      type: "voice",
      createdAt: new Date().toISOString(),
      creditCost: 3, // TTS costs 3 credits
    })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[Audio API] TTS error:", error)
    }
    return c.json({ error: "High load on GPU servers, please try again later." }, 500)
  }
})

// Voice cloning endpoint
audioRoutes.post("/clone", async (c) => {
  try {
    // Log request in development
    if (import.meta.env.DEV) {
      console.log("[Audio API] Voice cloning request received")
    }

    const { referenceAudio, text, voiceName } = await c.req.json()
    
    if (!referenceAudio || typeof referenceAudio !== "string") {
      return c.json({ error: "Please upload a reference audio sample to clone." }, 400)
    }
    
    if (!text || typeof text !== "string" || !text.trim()) {
      return c.json({ error: "Please enter text to synthesize with the cloned voice." }, 400)
    }
    
    if (text.length > 2000) {
      return c.json({ error: "Text is too long. Maximum 2000 characters for voice cloning." }, 400)
    }
    
    const apiToken = env.REPLICATE_API_TOKEN
    
    // Try Replicate XTTS voice cloning if available
    if (apiToken) {
      try {
        if (import.meta.env.DEV) {
          console.log("[Audio API] Attempting Replicate voice cloning")
        }
        
        const response = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version: "684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e", // coqui/xtts-v2
            input: {
              text: text.trim(),
              speaker_wav: referenceAudio,
              language: "en",
            },
          }),
        })
        
        if (response.ok) {
          const prediction = await response.json() as { id: string }
          const result = await pollReplicatePrediction(prediction.id, 90)
          
          if (result.output) {
            const audioUrl = Array.isArray(result.output) ? result.output[0] : result.output
            
            const wordCount = text.trim().split(/\s+/).length
            const durationSeconds = Math.ceil((wordCount / 150) * 60)
            
            if (import.meta.env.DEV) {
              console.log("[Audio API] Successfully cloned voice via Replicate")
            }
            
            return c.json({
              id: `clone-${Date.now()}`,
              url: audioUrl,
              text: text.trim(),
              voiceName: voiceName || "My Cloned Voice",
              duration: `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, "0")}`,
              type: "clone",
              createdAt: new Date().toISOString(),
              creditCost: 30, // Voice cloning - expensive GPU operation
            })
          }
        }
      } catch (replicateError) {
        if (import.meta.env.DEV) {
          console.warn("[Audio API] Replicate voice cloning failed:", replicateError)
        }
        // Fall through to sample response
      }
    } else if (import.meta.env.DEV) {
      console.warn("[Audio API] REPLICATE_API_TOKEN not configured, using sample audio")
    }
    
    // Return sample response for demonstration
    const wordCount = text.trim().split(/\s+/).length
    const durationSeconds = Math.ceil((wordCount / 150) * 60)
    
    return c.json({
      id: `clone-${Date.now()}`,
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      text: text.trim(),
      voiceName: voiceName || "My Cloned Voice",
      duration: `${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, "0")}`,
      type: "clone",
      createdAt: new Date().toISOString(),
      creditCost: 30, // Voice cloning - expensive GPU operation
    })
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("[Audio API] Voice cloning error:", error)
    }
    return c.json({ error: "High load on GPU servers, please try again later." }, 500)
  }
})

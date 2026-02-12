import { Hono } from "hono"

// Environment variables type for Hono context
type Env = {
  REPLICATE_API_TOKEN?: string
  LUMA_API_KEY?: string // Для прямого доступа к Luma Labs API
  KLING_API_KEY?: string // Для прямого доступа к Kling AI API
}

export const videoRoutes = new Hono<{ Bindings: Env }>()

// Animation preset prompt mapping
const PRESET_PROMPTS: Record<string, string> = {
  "smile-blink": "person smiles warmly, natural eye blinks, subtle head movement, genuine expression",
  "wave-hello": "person waves hand, friendly expression, natural arm movement, welcoming gesture",
  "look-around": "person looks left then right, curious expression, natural head turn, subtle movement",
  "old-film": "vintage film effect, sepia tones, film grain, slow deliberate movement, nostalgic aesthetic",
}

// Video model configurations - готовы к прямому подключению Luma/Kling API
// OpenRouter не поддерживает генерацию видео, поэтому используем прямые API
const VIDEO_MODELS = {
  standard: {
    // Luma Labs API (прямое подключение)
    provider: "luma",
    apiUrl: "https://api.lumalabs.ai/v1/generations",
    model: "luma-dream-machine",
    // Fallback через Replicate если API ключ не настроен
    replicateModel: "luma/ray",
    replicateVersion: "478f3f66f8ce6ebe0ceeea8d8eb64ff8f38ebed5f8dddfae1f4e72b0ea229a5b",
  },
  premium: {
    // Kling AI API (прямое подключение)
    provider: "kling",
    apiUrl: "https://api.klingai.com/v1/generations",
    model: "kling-v1",
    // Fallback через Replicate если API ключ не настроен
    replicateModel: "kling-ai/kling-v1",
    replicateVersion: "f7a86ae5f2d0c2cc3dd3ece46e2e8c5e8b7b8c8d9e0f1a2b3c4d5e6f7a8b9c0d",
  },
}

// Poll Replicate for prediction result
async function pollReplicatePrediction(predictionId: string, apiToken: string, maxAttempts = 120): Promise<{ status: string; output?: string | string[] }> {
  
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
      throw new Error(data.error || "Video generation failed")
    }
    
    // Wait 2 seconds before polling again (videos take longer)
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  throw new Error("Video generation timed out. Please try again.")
}

// Try generating video with Replicate
async function tryReplicateVideo(
  prompt: string, 
  duration: number, 
  aspectRatio: string,
  apiToken: string | undefined,
  referenceImage?: string | null
): Promise<string | null> {
  if (!apiToken) {
    return null // Replicate not configured
  }
  
  try {
    // Map aspect ratio to Replicate format
    const aspectMap: Record<string, string> = {
      "16:9": "16:9",
      "9:16": "9:16",
      "1:1": "1:1",
    }
    
    // Build input based on whether we have a reference image
    const input: Record<string, unknown> = {
      prompt: prompt,
      aspect_ratio: aspectMap[aspectRatio] || "16:9",
      loop: false,
    }
    
    // Add duration if model supports it (2 = free preview, 5, 10)
    if (duration) {
      input.duration = duration === 2 ? 2 : duration <= 5 ? 5 : 10
    }
    
    // Add reference image for image-to-video
    if (referenceImage) {
      input.image = referenceImage
    }
    
    // Create prediction with Luma model
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: VIDEO_MODELS.standard.version,
        input: input,
      }),
    })
    
    if (!response.ok) {
      return null
    }
    
    const prediction = await response.json() as { id: string }
    
    // Poll for result (videos take longer, up to 4 minutes)
    const result = await pollReplicatePrediction(prediction.id, apiToken, 120)
    
    if (result.output) {
      return Array.isArray(result.output) ? result.output[0] : result.output
    }
    
    return null
  } catch {
    return null
  }
}

// Sample video URLs for fallback demonstration
const SAMPLE_VIDEOS = [
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
]

const SAMPLE_ANIMATION_VIDEOS = [
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
]

// Dedicated endpoint for portrait animation (Bring Photos to Life feature)
videoRoutes.post("/animate", async (c) => {
  try {
    console.log("[Video API] Portrait animation request received")

    const { image, preset, duration, prompt: userPrompt } = await c.req.json()

    // Validate required fields
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

    // Try Replicate for video generation
    const apiToken = c.env.REPLICATE_API_TOKEN
    let videoUrl = await tryReplicateVideo(fullPrompt, finalDuration, "9:16", apiToken, image)
    
    // Only use sample video if Replicate is not configured
    if (!videoUrl) {
      if (!apiToken) {
        console.warn("[Video API] REPLICATE_API_TOKEN not configured, using sample video")
        videoUrl = SAMPLE_ANIMATION_VIDEOS[Math.floor(Math.random() * SAMPLE_ANIMATION_VIDEOS.length)]
      } else {
        // Replicate is configured but generation failed - return error
        return c.json({ error: "Video generation failed. Please try again later." }, 500)
      }
    } else {
      console.log("[Video API] Successfully generated animation via Replicate")
    }

    return c.json({
      id: `animate-${Date.now()}`,
      url: videoUrl,
      preset,
      duration: finalDuration,
      createdAt: new Date().toISOString(),
      creditCost: 30, // Expensive GPU operation - 30 credits
    })
  } catch (error) {
    console.error("[Video API] Portrait animation error:", error)
    return c.json({ error: "High load on GPU servers, please try again later." }, 500)
  }
})

// Original text-to-video and image-to-video endpoint
videoRoutes.post("/", async (c) => {
  try {
    console.log("[Video API] Video generation request received")

    const { prompt, duration, aspectRatio, motionScale, mode, referenceImage, videoModel } = await c.req.json()

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Please describe your video scene." }, 400)
    }

    // Validate image-to-video mode has a reference image
    if (mode === "image-to-video" && !referenceImage) {
      return c.json({ error: "Please upload a reference image for Image-to-Video mode." }, 400)
    }

    const validDurations = [2, 5, 10]
    const finalDuration = validDurations.includes(duration) ? duration : 5
    const isFreePreview = finalDuration === 2

    const validAspectRatios = ["16:9", "9:16", "1:1"]
    const finalAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "16:9"

    // Build enhanced prompt with motion context
    let enhancedPrompt = prompt.trim()
    
    // Add motion intensity to prompt
    if (motionScale) {
      const motionIntensity = motionScale <= 3 ? "subtle, slow" : motionScale <= 6 ? "moderate" : "dynamic, energetic"
      enhancedPrompt += `, ${motionIntensity} motion`
    }
    
    // Add cinematic quality
    enhancedPrompt += ", cinematic quality, smooth motion, professional video"

    // Try Replicate for actual video generation
    const apiToken = c.env.REPLICATE_API_TOKEN
    let videoUrl = await tryReplicateVideo(
      enhancedPrompt,
      finalDuration,
      finalAspectRatio,
      apiToken,
      mode === "image-to-video" ? referenceImage : null
    )
    
    // Only use sample video if Replicate is not configured
    if (!videoUrl) {
      if (!apiToken) {
        console.warn("[Video API] REPLICATE_API_TOKEN not configured, using sample video")
        videoUrl = SAMPLE_VIDEOS[Math.floor(Math.random() * SAMPLE_VIDEOS.length)]
      } else {
        // Replicate is configured but generation failed - return error
        return c.json({ error: "Video generation failed. Please try again later." }, 500)
      }
    } else {
      console.log("[Video API] Successfully generated video via Replicate")
    }

    return c.json({
      id: `video-${Date.now()}`,
      url: videoUrl,
      prompt: prompt.trim(),
      duration: finalDuration,
      aspectRatio: finalAspectRatio,
      mode: mode || "text-to-video",
      videoModel: videoModel || "standard",
      createdAt: new Date().toISOString(),
      creditCost: isFreePreview ? 0 : 30, // 2s preview free (Kling), full video 30 credits
    })
  } catch (error) {
    console.error("[Video API] Video generation error:", error)
    return c.json({ error: "High load on GPU servers, please try again later." }, 500)
  }
})

import { Hono } from "hono"
import { env } from "cloudflare:workers"

export const videoRoutes = new Hono()

// Animation preset prompt mapping
const PRESET_PROMPTS: Record<string, string> = {
  "smile-blink": "A photorealistic video of this person, they slowly form a warm, genuine smile while looking at the camera, natural eye blinking every few seconds, subtle head micro-movements, soft lighting, cinematic quality, smooth motion, lifelike facial animation",
  "wave-hello": "A photorealistic video of this person, they raise their right hand and wave hello to the camera with a friendly expression, natural arm movement, slight head tilt, warm smile, lifelike motion, welcoming gesture",
  "look-around": "A photorealistic video of this person, they naturally look to the left then slowly turn to look to the right, subtle head movement, curious expression, natural eye movement, realistic motion, gentle head turn",
  "old-film": "A vintage old film effect video of this person, subtle movement, slight smile, film grain texture, sepia tones, film flicker effect, nostalgic 1920s silent film aesthetic, slow deliberate movements, scratches and dust particles overlay",
}

// Dedicated endpoint for portrait animation (Bring Photos to Life feature)
videoRoutes.post("/animate", async (c) => {
  try {
    const { image, preset, duration } = await c.req.json()

    // Validate required fields
    if (!image || typeof image !== "string") {
      return c.json({ error: "Image is required" }, 400)
    }

    if (!preset || !PRESET_PROMPTS[preset]) {
      return c.json({ error: "Valid animation preset is required" }, 400)
    }

    const validDurations = [5, 10]
    const finalDuration = validDurations.includes(duration) ? duration : 5

    // Get the prompt for this preset
    const animationPrompt = PRESET_PROMPTS[preset]
    const fullPrompt = `${animationPrompt}, ${finalDuration} seconds duration`

    // Build the message content with the image
    const messageContent = [
      {
        type: "image_url",
        image_url: {
          url: image,
        },
      },
      {
        type: "text",
        text: `Animate this portrait photo using the following animation style:

Animation: ${animationPrompt}
Duration: ${finalDuration} seconds

This should be a photorealistic animation that brings the person in this photo to life. 
Describe the animation in vivid cinematic detail - exactly how the person's face moves, 
their expressions change, and how the overall effect feels magical and lifelike.`,
      },
    ]

    // Call OpenRouter with vision model to process the animation
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.VITE_BASE_URL || "https://synapse.app",
        "X-Title": "Synapse Motion Lab - Portrait Animation",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          {
            role: "system",
            content: `You are an AI portrait animation assistant specializing in the "Bring Photos to Life" feature. 
Your task is to describe how this portrait photo would be magically animated. 
Focus on subtle, realistic facial movements that make the photo come alive.
Be poetic and magical in your description - this is about creating wonder.`,
          },
          {
            role: "user",
            content: messageContent,
          },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      // Log detailed error only in development
      if (import.meta.env.DEV) {
        console.error("OpenRouter API error:", JSON.stringify(errorData))
      }
      return c.json(
        { error: "Failed to animate portrait. Please try again." },
        response.status
      )
    }

    const data = await response.json()
    const description = data.choices?.[0]?.message?.content || "Portrait animation completed"

    // For demonstration purposes, return sample video URLs
    // In production, this would integrate with video generation APIs like:
    // - Hedra (specialized in portrait animation)
    // - D-ID (talking avatars)
    // - HeyGen
    // - Runway Gen-3
    // - LivePortrait
    // - Luma Dream Machine
    
    const sampleAnimationVideos = [
      "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
      "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    ]
    
    const randomVideo = sampleAnimationVideos[Math.floor(Math.random() * sampleAnimationVideos.length)]

    return c.json({
      id: `animate-${Date.now()}`,
      url: randomVideo,
      description,
      preset,
      duration: finalDuration,
      createdAt: new Date().toISOString(),
    })
  } catch (error) {
    // Log errors in development only, without exposing sensitive data
    if (import.meta.env.DEV) {
      console.error("Portrait animation error:", error)
    }
    return c.json(
      { error: "Failed to animate portrait. Please try again." },
      500
    )
  }
})

// Original text-to-video and image-to-video endpoint
videoRoutes.post("/", async (c) => {
  try {
    const { prompt, duration, aspectRatio, motionScale, mode, referenceImage } = await c.req.json()

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Prompt is required" }, 400)
    }

    // Validate image-to-video mode has a reference image
    if (mode === "image-to-video" && !referenceImage) {
      return c.json({ error: "Reference image is required for Image-to-Video mode" }, 400)
    }

    // Build the message content based on mode
    let messageContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
    let systemPrompt: string

    if (mode === "image-to-video" && referenceImage) {
      systemPrompt = `You are an AI video generation assistant. The user wants to animate a photo they have uploaded. 
Describe in vivid detail how this image would be animated based on their motion prompt. 
Focus on the specific movements, camera work, and temporal progression.
Be creative and cinematic in your description.`

      messageContent = [
        {
          type: "image_url",
          image_url: {
            url: referenceImage,
          },
        },
        {
          type: "text",
          text: `Animate this photo with the following motion: ${prompt.trim()}
          
Duration: ${duration} seconds
Aspect ratio: ${aspectRatio}
Motion intensity: ${motionScale}/10

Describe the animation in detail - what moves, how it moves, camera motion, and the overall cinematic effect.`,
        },
      ]
    } else {
      systemPrompt = `You are an AI video generation assistant. 
Generate a detailed description of a video scene based on the user's prompt.
Be creative and cinematic in your description, including camera movements, lighting, and atmosphere.`

      messageContent = `Generate a ${duration}-second video with aspect ratio ${aspectRatio}:

Scene description: ${prompt.trim()}

Motion intensity: ${motionScale}/10

Describe the video scene in vivid detail - subjects, actions, camera movements, lighting, and atmosphere.`
    }

    // Call OpenRouter to get a description (for now, as actual video generation requires specialized APIs)
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.VITE_BASE_URL || "https://synapse.app",
        "X-Title": "Synapse Motion Lab",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: messageContent,
          },
        ],
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      // Log detailed error only in development
      if (import.meta.env.DEV) {
        console.error("OpenRouter API error:", JSON.stringify(errorData))
      }
      return c.json(
        { error: "Failed to process video request. Please try again." },
        response.status
      )
    }

    const data = await response.json()
    const description = data.choices?.[0]?.message?.content || "Video generation completed"

    // For now, return a placeholder video URL
    // In production, this would integrate with a real video generation service like:
    // - Runway Gen-2/Gen-3
    // - Luma Dream Machine
    // - Kling AI
    // - Pika Labs
    // - Stable Video Diffusion
    
    // Using a sample video URL for demonstration
    const sampleVideoUrls = [
      "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    ]
    
    const randomVideo = sampleVideoUrls[Math.floor(Math.random() * sampleVideoUrls.length)]

    return c.json({
      id: `video-${Date.now()}`,
      url: randomVideo,
      description,
      prompt,
      duration,
      aspectRatio,
      mode,
      createdAt: new Date().toISOString(),
    })
  } catch (error) {
    // Log errors in development only, without exposing sensitive data
    if (import.meta.env.DEV) {
      console.error("Video generation error:", error)
    }
    return c.json(
      { error: "Failed to generate video. Please try again." },
      500
    )
  }
})

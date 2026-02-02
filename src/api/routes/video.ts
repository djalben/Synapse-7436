import { Hono } from "hono"
import { env } from "cloudflare:workers"

export const videoRoutes = new Hono()

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
      console.error("OpenRouter API error:", JSON.stringify(errorData))
      return c.json(
        { error: errorData.error?.message || "Failed to process video request" },
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
    console.error("Video generation error:", error)
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to generate video" },
      500
    )
  }
})

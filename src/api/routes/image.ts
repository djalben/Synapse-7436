import { Hono } from "hono"
import { env } from "cloudflare:workers"

export const imageRoutes = new Hono()

// Aspect ratio to OpenRouter format mapping
const ASPECT_RATIO_MAP: Record<string, string> = {
  "1:1": "1:1",
  "16:9": "16:9",
  "9:16": "9:16",
}

// Style prompts for enhancing the base prompt
const stylePrompts: Record<string, string> = {
  photorealistic: "ultra realistic, photorealistic, high detail, 8k photography",
  anime: "anime style, manga art, vibrant colors, japanese animation style",
  "3d": "3D render, CGI, octane render, cinema 4D, high quality 3D graphics",
  cyberpunk: "cyberpunk style, neon lights, futuristic, blade runner aesthetic, neon city",
}

imageRoutes.post("/", async (c) => {
  try {
    const { prompt, aspectRatio, numImages, style, mode, referenceImage } = await c.req.json()

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Prompt is required" }, 400)
    }

    // Validate image-to-image mode has a reference image
    if (mode === "image-to-image" && !referenceImage) {
      return c.json({ error: "Reference image is required for Image-to-Image mode" }, 400)
    }

    // Enhance prompt with style if provided
    const styleEnhancement = style && stylePrompts[style] ? `, ${stylePrompts[style]}` : ""
    
    // Build the prompt based on mode
    let enhancedPrompt: string
    if (mode === "image-to-image") {
      // For image-to-image, focus on transformation
      enhancedPrompt = `Transform this image: ${prompt.trim()}${styleEnhancement}. Maintain the core subject/person while applying the transformation.`
    } else {
      enhancedPrompt = `Generate an image of: ${prompt.trim()}${styleEnhancement}`
    }

    // Generate images one at a time (most models only generate one image per request)
    const numToGenerate = Math.min(Math.max(numImages || 1, 1), 4)
    const generatedImages = []

    for (let i = 0; i < numToGenerate; i++) {
      // Build the message content based on mode
      let messageContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>
      
      if (mode === "image-to-image" && referenceImage) {
        // For image-to-image, include both the reference image and the prompt
        messageContent = [
          {
            type: "image_url",
            image_url: {
              url: referenceImage, // This is already a base64 data URL
            },
          },
          {
            type: "text",
            text: enhancedPrompt,
          },
        ]
      } else {
        // For text-to-image, just use the prompt
        messageContent = enhancedPrompt
      }

      // Call OpenRouter chat completions API with image modality
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": env.VITE_BASE_URL || "https://synapse.app",
          "X-Title": "Synapse Image Studio",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [
            {
              role: "user",
              content: messageContent,
            },
          ],
          modalities: ["image", "text"],
          stream: false,
          image_config: {
            aspect_ratio: ASPECT_RATIO_MAP[aspectRatio] || "1:1",
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("OpenRouter API error:", JSON.stringify(errorData))
        
        // If we already have some images, return them
        if (generatedImages.length > 0) {
          break
        }
        
        return c.json(
          { error: errorData.error?.message || "Failed to generate image" },
          response.status
        )
      }

      const data = await response.json()

      // Extract image URL from the response
      // The response format is: choices[0].message.images[].image_url.url (base64 data URL)
      const message = data.choices?.[0]?.message
      if (message?.images && message.images.length > 0) {
        for (const image of message.images) {
          const imageUrl = image.image_url?.url || image.imageUrl?.url
          if (imageUrl) {
            generatedImages.push({
              id: `${Date.now()}-${generatedImages.length}`,
              url: imageUrl,
              prompt: enhancedPrompt,
              aspectRatio,
              style,
              mode: mode || "text-to-image",
              createdAt: new Date().toISOString(),
            })
          }
        }
      }
    }

    if (generatedImages.length === 0) {
      return c.json({ error: "No images were generated. The model may not have returned any images." }, 500)
    }

    return c.json({ images: generatedImages })
  } catch (error) {
    console.error("Image generation error:", error)
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      500
    )
  }
})

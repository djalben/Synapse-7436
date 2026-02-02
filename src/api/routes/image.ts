import { Hono } from "hono"
import { env } from "cloudflare:workers"

export const imageRoutes = new Hono()

// Aspect ratio to size mapping for Flux model
const ASPECT_RATIO_MAP: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "16:9": { width: 1344, height: 768 },
  "9:16": { width: 768, height: 1344 },
}

// Style prompt enhancements
const STYLE_PROMPTS: Record<string, string> = {
  photorealistic: ", photorealistic, 8k, ultra detailed, professional photography, sharp focus, realistic lighting",
  anime: ", anime style, manga art, vibrant colors, detailed anime illustration",
  "3d": ", 3D render, Pixar style, CGI, high quality 3D graphics, octane render, cinema 4D",
  cyberpunk: ", cyberpunk, neon lights, futuristic, blade runner aesthetic, dark sci-fi, neon city",
}

// Nana Banana (niji-v6) anime enhancement
const NANA_BANANA_PROMPT = ", anime masterpiece, niji style, vibrant colors, high quality anime art, detailed anime illustration, professional anime artwork, beautiful anime aesthetic"

imageRoutes.post("/", async (c) => {
  try {
    // Check for required API key
    if (!env.OPENROUTER_API_KEY) {
      if (import.meta.env.DEV) {
        console.warn("OPENROUTER_API_KEY not configured")
      }
      return c.json({ error: "Image generation service is not available. Please try again later." }, 503)
    }

    const { prompt, aspectRatio, numImages, style, mode, referenceImage, specializedEngine } = await c.req.json()

    // Validate prompt
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return c.json({ error: "Please enter a prompt to generate an image." }, 400)
    }

    // Validate image-to-image mode has a reference image
    if (mode === "image-to-image" && !referenceImage) {
      return c.json({ error: "Please upload a reference image for Image-to-Image mode." }, 400)
    }

    // Get size from aspect ratio
    const size = ASPECT_RATIO_MAP[aspectRatio] || ASPECT_RATIO_MAP["1:1"]

    // Build enhanced prompt based on style or specialized engine
    let enhancedPrompt = prompt.trim()

    // Check if Nana Banana (niji-v6) specialized engine is active
    if (specializedEngine === "niji-v6") {
      // Nana Banana mode - premium anime engine
      enhancedPrompt += NANA_BANANA_PROMPT
    } else if (style && STYLE_PROMPTS[style]) {
      // Standard style enhancement
      enhancedPrompt += STYLE_PROMPTS[style]
    }

    // For image-to-image mode, add transformation context
    if (mode === "image-to-image") {
      enhancedPrompt = `Transform the reference image: ${enhancedPrompt}. Maintain the core subject while applying the transformation.`
    }

    // Generate images (flux-1-schnell generates one image per request)
    const numToGenerate = Math.min(Math.max(numImages || 1, 1), 4)
    const generatedImages = []

    for (let i = 0; i < numToGenerate; i++) {
      // For image-to-image mode, use a multimodal model
      // For text-to-image, use flux-1-schnell
      if (mode === "image-to-image" && referenceImage) {
        // Use Google's multimodal model for image-to-image
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": env.VITE_BASE_URL || "https://synapse.app",
            "X-Title": "Synapse Image Studio",
          },
          body: JSON.stringify({
            model: "google/gemini-2.0-flash-exp:free",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: referenceImage,
                    },
                  },
                  {
                    type: "text",
                    text: `Generate a new image based on this reference: ${enhancedPrompt}`,
                  },
                ],
              },
            ],
            modalities: ["image", "text"],
            stream: false,
          }),
        })

        if (!response.ok) {
          if (generatedImages.length > 0) break
          return c.json({ error: "Image transformation is experiencing high demand. Please try again later." }, 500)
        }

        const data = await response.json()
        const message = data.choices?.[0]?.message
        
        if (message?.images && message.images.length > 0) {
          for (const image of message.images) {
            const imageUrl = image.image_url?.url || image.imageUrl?.url
            if (imageUrl) {
              generatedImages.push({
                id: `${Date.now()}-${generatedImages.length}`,
                url: imageUrl,
                prompt: prompt.trim(),
                aspectRatio,
                style: specializedEngine === "niji-v6" ? "nana-banana" : style,
                mode: mode || "text-to-image",
                createdAt: new Date().toISOString(),
                creditCost: 1,
              })
            }
          }
        }
      } else {
        // Text-to-image: Use flux-1-schnell model
        const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": env.VITE_BASE_URL || "https://synapse.app",
            "X-Title": "Synapse Image Studio",
          },
          body: JSON.stringify({
            model: "black-forest-labs/flux-1-schnell",
            prompt: enhancedPrompt,
            n: 1,
            size: `${size.width}x${size.height}`,
          }),
        })

        if (!response.ok) {
          // Handle specific error cases with user-friendly messages
          const status = response.status
          
          if (generatedImages.length > 0) break
          
          if (status === 429) {
            return c.json({ error: "High demand right now. Please wait a moment and try again." }, 429)
          }
          if (status === 402 || status === 403) {
            return c.json({ error: "High load on GPU servers, please try again later." }, 500)
          }
          
          return c.json({ error: "Failed to generate image. Please try again." }, 500)
        }

        const data = await response.json()

        // Extract image URL from the response
        // Format: data[0].url or data[0].b64_json
        if (data.data && data.data.length > 0) {
          for (const image of data.data) {
            const imageUrl = image.url || (image.b64_json ? `data:image/png;base64,${image.b64_json}` : null)
            if (imageUrl) {
              generatedImages.push({
                id: `${Date.now()}-${generatedImages.length}`,
                url: imageUrl,
                prompt: prompt.trim(),
                aspectRatio,
                style: specializedEngine === "niji-v6" ? "nana-banana" : style,
                mode: mode || "text-to-image",
                createdAt: new Date().toISOString(),
                creditCost: 1,
              })
            }
          }
        }
      }
    }

    if (generatedImages.length === 0) {
      return c.json({ error: "Unable to generate images at this time. Please try a different prompt or try again later." }, 500)
    }

    return c.json({ 
      images: generatedImages,
      totalCreditCost: generatedImages.length,
    })
  } catch (error) {
    // Log errors in development only
    if (import.meta.env.DEV) {
      console.error("Image generation error:", error)
    }
    return c.json({ error: "Generation is taking longer than expected. Please try again." }, 500)
  }
})

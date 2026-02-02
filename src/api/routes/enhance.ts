import { Hono } from "hono"
import { env } from "cloudflare:workers"

export const enhanceRoutes = new Hono()

// Enhancement tool types
type EnhancementTool = "face-restore" | "colorize" | "beauty-retouch"

// Tool-specific prompts for image enhancement
const toolPrompts: Record<EnhancementTool, string> = {
  "face-restore": `Enhance and restore this photo with focus on:
- Fix any blur or noise in facial features
- Sharpen eyes, eyebrows, and facial details
- Improve skin texture while keeping it natural
- Enhance overall image clarity and sharpness
- Maintain the original person's appearance exactly
- Output a high-quality, clear photograph

Important: Keep the person's identity and expression identical. Only improve image quality.`,

  "colorize": `Colorize this black and white photo:
- Add realistic, historically accurate colors
- Use natural skin tones appropriate for the subject
- Color clothing, backgrounds, and objects realistically
- Maintain all original details and textures
- Create vivid but natural-looking colors
- Preserve the original composition and lighting

Important: Make the colorization look natural and authentic, not artificial or oversaturated.`,

  "beauty-retouch": `Apply professional beauty retouching to this portrait photo:
- Smooth skin texture subtly while keeping natural pores
- Even out skin tone and reduce blemishes
- Enhance lighting for a soft, flattering glow
- Brighten and clarify eyes
- Add subtle professional color grading
- Maintain natural appearance - no "plastic" or "airbrushed" look

Important: The result should look like professional photography, not heavy editing. Preserve the person's natural features and identity.`,
}

enhanceRoutes.post("/", async (c) => {
  try {
    const { image, tool } = await c.req.json()

    // Validate inputs
    if (!image || typeof image !== "string") {
      return c.json({ error: "Image is required" }, 400)
    }

    if (!tool || !["face-restore", "colorize", "beauty-retouch"].includes(tool)) {
      return c.json({ error: "Invalid enhancement tool" }, 400)
    }

    // Validate that image is a base64 data URL
    if (!image.startsWith("data:image/")) {
      return c.json({ error: "Invalid image format. Expected base64 data URL" }, 400)
    }

    const enhancementPrompt = toolPrompts[tool as EnhancementTool]
    const startTime = Date.now()

    // Call OpenRouter chat completions API with image modality
    // Using Gemini 2.5 Flash for image generation/manipulation
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.VITE_BASE_URL || "https://synapse.app",
        "X-Title": "Synapse Photo Enhancement",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: image,
                },
              },
              {
                type: "text",
                text: enhancementPrompt,
              },
            ],
          },
        ],
        modalities: ["image", "text"],
        stream: false,
        image_config: {
          aspect_ratio: "1:1", // Keep original aspect ratio behavior
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      // Log detailed error only in development
      if (import.meta.env.DEV) {
        console.error("OpenRouter API error:", JSON.stringify(errorData))
      }
      return c.json(
        { error: "Failed to enhance image. Please try again." },
        response.status
      )
    }

    const data = await response.json()
    const processingTime = Date.now() - startTime

    // Extract enhanced image from the response
    const message = data.choices?.[0]?.message
    if (message?.images && message.images.length > 0) {
      const enhancedImage = message.images[0]
      const enhancedUrl = enhancedImage.image_url?.url || enhancedImage.imageUrl?.url

      if (enhancedUrl) {
        return c.json({
          originalUrl: image,
          enhancedUrl: enhancedUrl,
          tool,
          processingTime,
        })
      }
    }

    // If no image was returned, return an error
    return c.json({ error: "Enhancement failed. No image was returned by the model." }, 500)
  } catch (error) {
    // Log errors in development only, without exposing sensitive data
    if (import.meta.env.DEV) {
      console.error("Image enhancement error:", error)
    }
    return c.json(
      { error: "Failed to enhance image. Please try again." },
      500
    )
  }
})

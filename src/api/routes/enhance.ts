import { Hono } from "hono"

// Environment variables type for Hono context
type Env = {
  REPLICATE_API_TOKEN?: string
  OPENROUTER_API_KEY?: string
  VITE_BASE_URL?: string
}

export const enhanceRoutes = new Hono<{ Bindings: Env }>()

// Enhancement tool types
type EnhancementTool = "face-restore" | "colorize" | "beauty-retouch"

// Replicate model endpoints
const REPLICATE_MODELS: Record<EnhancementTool, { version: string; prepareInput: (imageUrl: string) => Record<string, unknown> }> = {
  "face-restore": {
    // CodeFormer for face restoration
    version: "sczhou/codeformer:7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56",
    prepareInput: (imageUrl: string) => ({
      image: imageUrl,
      upscale: 2,
      face_upsample: true,
      background_enhance: true,
      codeformer_fidelity: 0.7, // Balance between quality and likeness
    }),
  },
  "colorize": {
    // DeOldify for colorization
    version: "arielreplicate/deoldify_image:0da600fab0c45a66211339f1c16b71345d22f26ef5f42e18e9504ea5c86c86a6",
    prepareInput: (imageUrl: string) => ({
      input_image: imageUrl,
      model_name: "Artistic", // Artistic or Stable
      render_factor: 35, // Higher = more color saturation
    }),
  },
  "beauty-retouch": {
    // Use GFPGAN for beauty enhancement (better skin smoothing)
    version: "tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c",
    prepareInput: (imageUrl: string) => ({
      img: imageUrl,
      version: "v1.4", // Latest version
      scale: 2,
    }),
  },
}

// Fallback prompts for OpenRouter if Replicate unavailable
const FALLBACK_PROMPTS: Record<EnhancementTool, string> = {
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
Important: The result should look like professional photography, not heavy editing.`,
}

// Poll Replicate for prediction result
async function pollReplicatePrediction(predictionId: string, apiToken: string, maxAttempts = 60): Promise<{ status: string; output?: string | string[] }> {
  
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
      throw new Error(data.error || "Enhancement failed")
    }
    
    // Wait 1 second before polling again
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  throw new Error("Enhancement timed out. Please try again.")
}

// Try Replicate API
async function tryReplicateEnhancement(image: string, tool: EnhancementTool, apiToken: string | undefined): Promise<string | null> {
  if (!apiToken) {
    return null // Replicate not configured, use fallback
  }
  
  const modelConfig = REPLICATE_MODELS[tool]
  
  try {
    // Create prediction
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: modelConfig.version.split(":")[1],
        input: modelConfig.prepareInput(image),
      }),
    })
    
    if (!response.ok) {
      return null // Fall back to OpenRouter
    }
    
    const prediction = await response.json() as { id: string }
    
    // Poll for result
    const result = await pollReplicatePrediction(prediction.id, apiToken)
    
    // Extract output URL
    if (result.output) {
      // Output can be a string URL or array of URLs
      const outputUrl = Array.isArray(result.output) ? result.output[0] : result.output
      return outputUrl
    }
    
    return null
  } catch {
    return null // Fall back to OpenRouter
  }
}

// Fallback to OpenRouter
async function fallbackOpenRouterEnhancement(image: string, tool: EnhancementTool, openRouterKey: string | undefined, baseUrl: string | undefined): Promise<string | null> {
  if (!openRouterKey) {
    return null
  }
  
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openRouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": baseUrl || "https://synapse.app",
      "X-Title": "Synapse Photo Enhancement",
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
                url: image,
              },
            },
            {
              type: "text",
              text: FALLBACK_PROMPTS[tool],
            },
          ],
        },
      ],
      modalities: ["image", "text"],
      stream: false,
    }),
  })
  
  if (!response.ok) {
    return null
  }
  
  const data = await response.json() as { 
    choices?: Array<{ 
      message?: { 
        images?: Array<{ 
          image_url?: { url: string }
          imageUrl?: { url: string } 
        }> 
      } 
    }> 
  }
  const message = data.choices?.[0]?.message
  
  if (message?.images && message.images.length > 0) {
    const enhancedImage = message.images[0]
    return enhancedImage.image_url?.url || enhancedImage.imageUrl?.url || null
  }
  
  return null
}

enhanceRoutes.post("/", async (c) => {
  try {
    console.log("[Enhance API] Image enhancement request received")

    const { image, tool } = await c.req.json()

    // Validate inputs
    if (!image || typeof image !== "string") {
      return c.json({ error: "Please upload an image to enhance." }, 400)
    }

    if (!tool || !["face-restore", "colorize", "beauty-retouch"].includes(tool)) {
      return c.json({ error: "Please select an enhancement tool." }, 400)
    }

    // Validate that image is a base64 data URL
    if (!image.startsWith("data:image/")) {
      return c.json({ error: "Invalid image format. Please upload a JPG or PNG image." }, 400)
    }

    const startTime = Date.now()
    let enhancedUrl: string | null = null
    
    // Try Replicate first (better quality for specific tasks)
    console.log(`[Enhance API] Attempting Replicate enhancement for tool: ${tool}`)
    enhancedUrl = await tryReplicateEnhancement(image, tool as EnhancementTool, c.env.REPLICATE_API_TOKEN)
    
    // Fall back to OpenRouter if Replicate unavailable or failed
    if (!enhancedUrl) {
      console.warn("[Enhance API] Replicate failed, falling back to OpenRouter")
      enhancedUrl = await fallbackOpenRouterEnhancement(image, tool as EnhancementTool, c.env.OPENROUTER_API_KEY, c.env.VITE_BASE_URL)
    } else {
      console.log("[Enhance API] Successfully enhanced via Replicate")
    }
    
    const processingTime = Date.now() - startTime

    if (enhancedUrl) {
      console.log(`[Enhance API] Enhancement completed in ${processingTime}ms`)
      return c.json({
        originalUrl: image,
        enhancedUrl: enhancedUrl,
        tool,
        processingTime,
        creditCost: 3, // Enhancement costs 3 credits
      })
    }

    // If no image was returned, return user-friendly error
    console.error("[Enhance API] Both Replicate and OpenRouter failed")
    return c.json({ error: "High load on GPU servers, please try again later." }, 500)
  } catch (error) {
    // Log errors
    console.error("[Enhance API] Image enhancement error:", error)
    return c.json({ error: "Enhancement is taking longer than expected. Please try again." }, 500)
  }
})

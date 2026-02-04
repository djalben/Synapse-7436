import { Hono } from "hono"
import { streamText, convertToModelMessages, UIMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { env } from "cloudflare:workers"

export const chatRoutes = new Hono()

// Model mapping from frontend IDs to OpenRouter model IDs
const MODEL_MAP: Record<string, string> = {
  "deepseek-r1": "deepseek/deepseek-r1",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "gpt-4o": "openai/gpt-4o",
  "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
  "gpt-5-o1": "openai/o1",
  // Legacy mappings for backwards compatibility
  "deepseek-v3": "deepseek/deepseek-chat",
}

// Credit costs per model
// UPDATED: Balanced economy pricing
const CREDIT_COSTS: Record<string, number> = {
  "deepseek-r1": 0.1,     // Free lead magnet
  "gpt-4o-mini": 0.1,     // Cheap fast option
  "gpt-4o": 1,            // 1 credit (was 1)
  "claude-3.5-sonnet": 1, // 1 credit (was 3)
  "gpt-5-o1": 5,          // 5 credits (was 20)
  "deepseek-v3": 0.5,     // Legacy
}

chatRoutes.post("/", async (c) => {
  try {
    // Check for required API key
    if (!env.AI_GATEWAY_API_KEY || !env.AI_GATEWAY_BASE_URL) {
      if (import.meta.env.DEV) {
        console.warn("AI Gateway not configured")
      }
      return c.json({ error: "Chat service is not available. Please try again later." }, 503)
    }

    const { messages, model } = await c.req.json()

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: "Please enter a message to continue." }, 400)
    }

    if (messages.length === 0) {
      return c.json({ error: "Please enter a message to continue." }, 400)
    }

    // Validate model is recognized
    const validModels = Object.keys(MODEL_MAP)
    if (model && !validModels.includes(model)) {
      return c.json({ error: "Invalid model selected. Please choose a valid model." }, 400)
    }

    // Map the model ID to OpenRouter format (default to DeepSeek R1)
    const modelId = MODEL_MAP[model] || "deepseek/deepseek-r1"
    
    // Get credit cost for response metadata
    const creditCost = CREDIT_COSTS[model] || 0.1

    // Create OpenAI-compatible client pointing to the AI Gateway
    const openai = createOpenAI({
      baseURL: env.AI_GATEWAY_BASE_URL,
      apiKey: env.AI_GATEWAY_API_KEY,
    })

    // Convert UI messages to model messages
    const modelMessages = await convertToModelMessages(messages as UIMessage[])

    const result = streamText({
      model: openai.chat(modelId),
      messages: modelMessages,
    })

    // Return streaming response with credit cost in headers
    const response = result.toUIMessageStreamResponse()
    
    // Add credit cost header for frontend consumption
    response.headers.set("X-Credit-Cost", creditCost.toString())
    
    return response
  } catch (error) {
    // Log errors in development only
    if (import.meta.env.DEV) {
      console.error("Chat API error:", error)
    }
    
    // Return user-friendly error messages
    // Never expose internal details, API keys, or payment info
    const errorMessage = error instanceof Error ? error.message : ""
    
    // Check for rate limit
    if (errorMessage.includes("rate") || errorMessage.includes("429")) {
      return c.json({ error: "High demand right now. Please wait a moment and try again." }, 429)
    }
    
    // Check for payment/billing issues (hide the real reason)
    if (errorMessage.includes("402") || errorMessage.includes("payment") || errorMessage.includes("billing") || errorMessage.includes("fund")) {
      return c.json({ error: "High load on GPU servers, please try again later." }, 500)
    }
    
    // Check for model unavailable
    if (errorMessage.includes("model") || errorMessage.includes("unavailable")) {
      return c.json({ error: "This model is temporarily unavailable. Try a different option." }, 500)
    }
    
    // Generic fallback
    return c.json({ error: "Connection issue. Please check your internet and try again." }, 500)
  }
})

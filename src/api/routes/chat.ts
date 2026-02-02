import { Hono } from "hono"
import { streamText, convertToModelMessages, UIMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { env } from "cloudflare:workers"

export const chatRoutes = new Hono()

// Model mapping from frontend IDs to OpenRouter model IDs
const MODEL_MAP: Record<string, string> = {
  "gpt-4o": "openai/gpt-4o",
  "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
  "deepseek-v3": "deepseek/deepseek-chat",
}

chatRoutes.post("/", async (c) => {
  try {
    const { messages, model } = await c.req.json()

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: "Please enter a message to continue." }, 400)
    }

    if (messages.length === 0) {
      return c.json({ error: "Please enter a message to continue." }, 400)
    }

    // Map the model ID to OpenRouter format
    const modelId = MODEL_MAP[model] || "openai/gpt-4o"

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

    return result.toUIMessageStreamResponse()
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

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

    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: "Messages array is required" }, 400)
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
    console.error("Chat API error:", error)
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to process chat request" },
      500
    )
  }
})

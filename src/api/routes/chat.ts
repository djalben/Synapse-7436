import { Hono } from "hono"
import { streamText, convertToModelMessages, UIMessage } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

export const chatRoutes = new Hono()

// OpenRouter model mapping (frontend ID → OpenRouter model ID)
const MODEL_MAP: Record<string, string> = {
  "deepseek-r1": "deepseek/deepseek-r1",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "gpt-4o": "openai/gpt-4o",
  "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
  "gpt-5-o1": "openai/gpt-5.2-chat",
}

// Credit costs per model
const CREDIT_COSTS: Record<string, number> = {
  "deepseek-r1": 0.1,
  "gpt-4o-mini": 0.1,
  "gpt-4o": 1,
  "claude-3.5-sonnet": 1,
  "gpt-5-o1": 5,
}

chatRoutes.post("/", async (c) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.warn("[Chat] OPENROUTER_API_KEY not configured")
      return c.json({ error: "Chat service is not available. Please try again later." }, 503)
    }

    const body = await c.req.json<{ messages: UIMessage[], model?: string }>()
    const { messages, model } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: "Please enter a message to continue." }, 400)
    }

    // Default model: anthropic/claude-3.5-sonnet
    const modelId = MODEL_MAP[model ?? ""] || "anthropic/claude-3.5-sonnet"
    const creditCost = CREDIT_COSTS[model ?? ""] || 1

    console.log(`[Chat] model=${modelId}, messages=${messages.length}`)

    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    })

    const modelMessages = await convertToModelMessages(messages as UIMessage[])

    const result = streamText({
      model: openrouter.chat(modelId),
      messages: modelMessages,
    })

    const response = result.toUIMessageStreamResponse()
    response.headers.set("X-Credit-Cost", creditCost.toString())
    return response
  } catch (error) {
    console.error("[Chat] API error:", error)
    const msg = error instanceof Error ? error.message : ""

    if (msg.includes("rate") || msg.includes("429")) {
      return c.json({ error: "High demand right now. Please wait a moment and try again." }, 429)
    }
    if (msg.includes("402") || msg.includes("payment") || msg.includes("billing") || msg.includes("fund")) {
      return c.json({ error: "High load on GPU servers, please try again later." }, 500)
    }
    if (msg.includes("model") || msg.includes("unavailable")) {
      return c.json({ error: "This model is temporarily unavailable. Try a different option." }, 500)
    }
    return c.json({ error: "Connection issue. Please check your internet and try again." }, 500)
  }
})

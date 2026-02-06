import { createOpenAI } from "@ai-sdk/openai"
import { streamText, convertToModelMessages } from "ai"

export const config = { runtime: 'edge' };

// КАРТА МОДЕЛЕЙ (Тот самый переводчик)
const MODEL_MAP: Record<string, string> = {
  "deepseek-r1": "deepseek/deepseek-r1",
  "gpt-4o": "openai/gpt-4o",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
  "gpt-5-o1": "openai/o1"
};

export default async function handler(req: Request) {
  try {
    const { messages, model } = await req.json();
    
    // Выбираем правильный ID или берем DeepSeek по умолчанию
    const fullModelId = MODEL_MAP[model] || "deepseek/deepseek-r1";

    const openai = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const result = streamText({
      model: openai.chat(fullModelId),
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat Error:", error);
    return new Response(JSON.stringify({ error: "API Error" }), { status: 500 });
  }
}

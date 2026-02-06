import { createOpenAI } from "@ai-sdk/openai"
import { streamText, convertToModelMessages } from "ai"

export const config = { runtime: 'edge' }; // Критически важно для Vercel

export default async function handler(req: Request) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const { messages, model } = await req.json();

    const openai = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
    });

    const result = streamText({
      model: openai.chat(model || "deepseek/deepseek-r1"),
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return new Response(JSON.stringify({ error: "Ошибка ключа или связи с AI" }), { status: 500 });
  }
}

import { Hono } from "hono"

export const monitoringRoutes = new Hono()

/**
 * Проверяет баланс OpenRouter через /api/v1/auth/key
 */
async function checkOpenRouterBalance(apiKey: string): Promise<{ balance?: number; error?: string }> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      return { error: `HTTP ${response.status}: ${errorText.substring(0, 200)}` }
    }

    const data = await response.json() as { data?: { limit?: number; usage?: number; limit_remaining?: number } }
    const remaining = data.data?.limit_remaining
    
    return { balance: typeof remaining === "number" ? remaining : undefined }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Отправляет сообщение в Telegram через Bot API
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      return { success: false, error: `HTTP ${response.status}: ${errorText.substring(0, 200)}` }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Роут для ручной проверки баланса и отправки уведомления
 * GET /api/monitoring/check-balance
 */
monitoringRoutes.get("/check-balance", async (c) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (!apiKey) {
      return c.json({ error: "OPENROUTER_API_KEY is not configured" }, 400)
    }

    const balanceResult = await checkOpenRouterBalance(apiKey)

    if (balanceResult.error) {
      return c.json({
        success: false,
        error: balanceResult.error,
        balance: null,
        telegramSent: false,
      }, 500)
    }

    const balance = balanceResult.balance ?? 0
    const balanceMessage = `💰 <b>OpenRouter Balance Check</b>\n\n` +
      `Remaining: <b>$${balance.toFixed(2)}</b>\n` +
      `Checked at: ${new Date().toISOString()}`

    let telegramSent = false
    let telegramError: string | undefined

    if (telegramBotToken && telegramChatId) {
      const telegramResult = await sendTelegramMessage(telegramBotToken, telegramChatId, balanceMessage)
      telegramSent = telegramResult.success
      telegramError = telegramResult.error
    }

    return c.json({
      success: true,
      balance,
      checkedAt: new Date().toISOString(),
      telegramSent,
      telegramError,
    })
  } catch (error) {
    console.error("[Monitoring] Error checking balance:", error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500)
  }
})

/**
 * Роут для настройки автоматической проверки баланса (вызывается по расписанию)
 * POST /api/monitoring/daily-check
 * 
 * Этот роут должен вызываться по расписанию (например, через Vercel Cron или внешний сервис)
 */
monitoringRoutes.post("/daily-check", async (c) => {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN
    const telegramChatId = process.env.TELEGRAM_CHAT_ID

    if (!apiKey) {
      return c.json({ error: "OPENROUTER_API_KEY is not configured" }, 400)
    }

    if (!telegramBotToken || !telegramChatId) {
      return c.json({
        success: false,
        error: "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be configured for daily checks",
      }, 400)
    }

    const balanceResult = await checkOpenRouterBalance(apiKey)

    if (balanceResult.error) {
      const errorMessage = `❌ <b>OpenRouter Balance Check Failed</b>\n\n` +
        `Error: ${balanceResult.error}\n` +
        `Checked at: ${new Date().toISOString()}`
      
      await sendTelegramMessage(telegramBotToken, telegramChatId, errorMessage)
      
      return c.json({
        success: false,
        error: balanceResult.error,
        telegramSent: true,
      }, 500)
    }

    const balance = balanceResult.balance ?? 0
    
    const isLowBalance = balance < 2
    const emoji = isLowBalance ? "⚠️" : "✅"
    const warning = isLowBalance ? "\n\n⚠️ <b>Warning: Low balance!</b>" : ""

    const balanceMessage = `${emoji} <b>Daily OpenRouter Balance Check</b>\n\n` +
      `Remaining: <b>$${balance.toFixed(2)}</b>${warning}\n` +
      `Checked at: ${new Date().toISOString()}`

    const telegramResult = await sendTelegramMessage(telegramBotToken, telegramChatId, balanceMessage)

    return c.json({
      success: true,
      balance,
      isLowBalance,
      checkedAt: new Date().toISOString(),
      telegramSent: telegramResult.success,
      telegramError: telegramResult.error,
    })
  } catch (error) {
    console.error("[Monitoring] Error in daily check:", error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500)
  }
})

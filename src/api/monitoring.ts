import { Hono } from "hono"
import { env as getRuntimeEnv } from "hono/adapter"

// Environment variables type for Hono context
type Env = {
  AIMLAPI_KEY?: string
  TELEGRAM_BOT_TOKEN?: string
  TELEGRAM_CHAT_ID?: string
}

export const monitoringRoutes = new Hono<{ Bindings: Env }>()

/**
 * Проверяет баланс AIMLAPI через эндпоинт /billing/balance
 */
async function checkAimlapiBalance(apiKey: string): Promise<{ balance?: number; error?: string }> {
  try {
    const response = await fetch("https://api.aimlapi.com/v1/billing/balance", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      return { error: `HTTP ${response.status}: ${errorText.substring(0, 200)}` }
    }

    const data = await response.json() as { balance?: number; credits?: number; amount?: number }
    
    // Поддержка разных форматов ответа
    const balance = data.balance ?? data.credits ?? data.amount
    
    return { balance: typeof balance === "number" ? balance : undefined }
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
    const runtimeEnv = getRuntimeEnv<Env>(c)
    const aimlapiKey = runtimeEnv?.AIMLAPI_KEY
    const telegramBotToken = runtimeEnv?.TELEGRAM_BOT_TOKEN
    const telegramChatId = runtimeEnv?.TELEGRAM_CHAT_ID

    if (!aimlapiKey) {
      return c.json({ error: "AIMLAPI_KEY is not configured" }, 400)
    }

    // Проверяем баланс
    const balanceResult = await checkAimlapiBalance(aimlapiKey)

    if (balanceResult.error) {
      return c.json({
        success: false,
        error: balanceResult.error,
        balance: null,
        telegramSent: false,
      }, 500)
    }

    const balance = balanceResult.balance ?? 0
    const balanceMessage = `💰 <b>AIMLAPI Balance Check</b>\n\n` +
      `Balance: <b>${balance.toFixed(2)}</b> credits\n` +
      `Checked at: ${new Date().toISOString()}`

    // Отправляем в Telegram, если настроено
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
    const runtimeEnv = getRuntimeEnv<Env>(c)
    const aimlapiKey = runtimeEnv?.AIMLAPI_KEY
    const telegramBotToken = runtimeEnv?.TELEGRAM_BOT_TOKEN
    const telegramChatId = runtimeEnv?.TELEGRAM_CHAT_ID

    if (!aimlapiKey) {
      return c.json({ error: "AIMLAPI_KEY is not configured" }, 400)
    }

    if (!telegramBotToken || !telegramChatId) {
      return c.json({
        success: false,
        error: "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be configured for daily checks",
      }, 400)
    }

    // Проверяем баланс
    const balanceResult = await checkAimlapiBalance(aimlapiKey)

    if (balanceResult.error) {
      const errorMessage = `❌ <b>AIMLAPI Balance Check Failed</b>\n\n` +
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
    
    // Предупреждение, если баланс низкий (менее 10 кредитов)
    const isLowBalance = balance < 10
    const emoji = isLowBalance ? "⚠️" : "✅"
    const warning = isLowBalance ? "\n\n⚠️ <b>Warning: Low balance!</b>" : ""

    const balanceMessage = `${emoji} <b>Daily AIMLAPI Balance Check</b>\n\n` +
      `Balance: <b>${balance.toFixed(2)}</b> credits${warning}\n` +
      `Checked at: ${new Date().toISOString()}`

    // Отправляем в Telegram
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

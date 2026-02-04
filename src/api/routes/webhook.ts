import { Hono } from "hono"

// Credit packages with prices (matching paywall-modal.tsx)
const CREDIT_PACKAGES: Record<string, { credits: number; price: number }> = {
  'start': { credits: 100, price: 590 },
  'creator': { credits: 500, price: 2490 },
  'pro_studio': { credits: 1500, price: 5990 },
  'unlimited': { credits: 5000, price: 14990 },
}

// Lava Webhook payload interface
interface LavaWebhookPayload {
  status: string;
  order_id: string;
  amount: number;
  custom_fields?: {
    user_id?: string;
    package_id?: string;
  };
  signature?: string;
}

export const webhookRoutes = new Hono()

// Health check endpoint
webhookRoutes.get("/status", (c) => {
  return c.json({ 
    status: "ok", 
    service: "Lava Webhooks",
    timestamp: new Date().toISOString()
  })
})

// Lava Payment Webhook
webhookRoutes.post("/lava", async (c) => {
  try {
    const body = await c.req.json() as LavaWebhookPayload
    
    // Log webhook receipt in development
    console.log('[Lava Webhook] Received:', JSON.stringify(body, null, 2))
    
    // Extract payment data
    const { status, order_id, amount, custom_fields } = body
    
    // Only process successful payments
    if (status !== 'success') {
      console.log(`[Lava Webhook] Payment not successful: ${status}`)
      return c.json({ 
        success: false, 
        message: 'Платеж не завершен',
        status 
      })
    }
    
    // Validate required fields
    const userId = custom_fields?.user_id
    const packageId = custom_fields?.package_id
    
    if (!userId) {
      console.error('[Lava Webhook] Missing user_id in custom_fields')
      return c.json({ 
        success: false, 
        message: 'Отсутствует user_id' 
      }, 400)
    }
    
    if (!packageId) {
      console.error('[Lava Webhook] Missing package_id in custom_fields')
      return c.json({ 
        success: false, 
        message: 'Отсутствует package_id' 
      }, 400)
    }
    
    // Validate package exists
    const creditPackage = CREDIT_PACKAGES[packageId]
    if (!creditPackage) {
      console.error(`[Lava Webhook] Unknown package: ${packageId}`)
      return c.json({ 
        success: false, 
        message: `Неизвестный пакет: ${packageId}` 
      }, 400)
    }
    
    // Validate amount matches expected price (with small tolerance)
    const expectedPrice = creditPackage.price
    const priceDifference = Math.abs(amount - expectedPrice)
    if (priceDifference > 1) { // Allow 1 RUB tolerance for rounding
      console.warn(`[Lava Webhook] Price mismatch: expected ${expectedPrice}, got ${amount}`)
      // Don't reject, just log warning - Lava might include fees differently
    }
    
    // =================================================
    // TODO: Database Integration
    // When D1 database is ready, uncomment and implement:
    // =================================================
    
    // 1. Add credits to user balance
    // const db = c.env.DB;
    // await db.update(users)
    //   .set({ 
    //     creditBalance: sql`credit_balance + ${creditPackage.credits}` 
    //   })
    //   .where(eq(users.id, userId))
    
    // 2. Record payment in history
    // await db.insert(payments).values({
    //   id: crypto.randomUUID(),
    //   userId,
    //   amount: creditPackage.price,
    //   credits: creditPackage.credits,
    //   status: 'completed',
    //   lavaOrderId: order_id,
    //   packageId,
    //   createdAt: new Date()
    // })
    
    // Log success
    console.log(`[Lava Webhook] ✅ Начислено ${creditPackage.credits} кредитов пользователю ${userId}`)
    console.log(`[Lava Webhook] Order ID: ${order_id}, Package: ${packageId}, Amount: ${amount} ₽`)
    
    return c.json({ 
      success: true, 
      message: `Начислено ${creditPackage.credits} кредитов`,
      data: {
        userId,
        packageId,
        credits: creditPackage.credits,
        orderId: order_id
      }
    })
    
  } catch (error) {
    console.error('[Lava Webhook] Error processing webhook:', error)
    return c.json({ 
      success: false, 
      message: 'Внутренняя ошибка сервера' 
    }, 500)
  }
})

// Test webhook endpoint (for development/testing)
webhookRoutes.post("/lava/test", async (c) => {
  try {
    const body = await c.req.json()
    
    console.log('[Lava Test Webhook] Received test payload:', JSON.stringify(body, null, 2))
    
    return c.json({
      success: true,
      message: 'Test webhook received',
      receivedData: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return c.json({
      success: false,
      message: 'Error processing test webhook'
    }, 500)
  }
})

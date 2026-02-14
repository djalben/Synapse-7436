import { Hono } from "hono"
import { drizzle } from "drizzle-orm/d1"
import { eq, desc } from "drizzle-orm"
import { conversations, chatMessages } from "../database/schema.js"

export const conversationRoutes = new Hono()

// Helper: get D1-backed drizzle instance from Hono context, or null
function getDb(c: any) {
  try {
    const d1 = c.env?.DB
    if (!d1) return null
    return drizzle(d1, { schema: { conversations, chatMessages } })
  } catch {
    return null
  }
}

// GET /api/conversations — list all conversations for a user
conversationRoutes.get("/", async (c) => {
  const db = getDb(c)
  if (!db) return c.json({ error: "db_unavailable" }, 503)

  const userId = c.req.header("X-User-Id") || "anonymous"
  try {
    const rows = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        model: conversations.model,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))

    return c.json(rows)
  } catch (err: any) {
    console.error("[conversations] list error:", err)
    return c.json({ error: err.message }, 500)
  }
})

// GET /api/conversations/:id/messages — get messages for a conversation
conversationRoutes.get("/:id/messages", async (c) => {
  const db = getDb(c)
  if (!db) return c.json({ error: "db_unavailable" }, 503)

  const convId = c.req.param("id")
  try {
    const msgs = await db
      .select({
        id: chatMessages.id,
        role: chatMessages.role,
        content: chatMessages.content,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, convId))
      .orderBy(chatMessages.createdAt)

    return c.json(msgs)
  } catch (err: any) {
    console.error("[conversations] messages error:", err)
    return c.json({ error: err.message }, 500)
  }
})

// POST /api/conversations — create a new conversation
conversationRoutes.post("/", async (c) => {
  const db = getDb(c)
  if (!db) return c.json({ error: "db_unavailable" }, 503)

  const userId = c.req.header("X-User-Id") || "anonymous"
  try {
    const body = await c.req.json<{ id: string; title: string; model: string }>()
    await db.insert(conversations).values({
      id: body.id,
      userId,
      title: body.title,
      model: body.model,
    })
    return c.json({ ok: true, id: body.id })
  } catch (err: any) {
    console.error("[conversations] create error:", err)
    return c.json({ error: err.message }, 500)
  }
})

// PUT /api/conversations/:id — update title/model
conversationRoutes.put("/:id", async (c) => {
  const db = getDb(c)
  if (!db) return c.json({ error: "db_unavailable" }, 503)

  const convId = c.req.param("id")
  try {
    const body = await c.req.json<{ title?: string; model?: string }>()
    const updates: Record<string, any> = { updatedAt: new Date() }
    if (body.title !== undefined) updates.title = body.title
    if (body.model !== undefined) updates.model = body.model

    await db.update(conversations).set(updates).where(eq(conversations.id, convId))
    return c.json({ ok: true })
  } catch (err: any) {
    console.error("[conversations] update error:", err)
    return c.json({ error: err.message }, 500)
  }
})

// DELETE /api/conversations/:id — delete conversation and its messages
conversationRoutes.delete("/:id", async (c) => {
  const db = getDb(c)
  if (!db) return c.json({ error: "db_unavailable" }, 503)

  const convId = c.req.param("id")
  try {
    await db.delete(chatMessages).where(eq(chatMessages.conversationId, convId))
    await db.delete(conversations).where(eq(conversations.id, convId))
    return c.json({ ok: true })
  } catch (err: any) {
    console.error("[conversations] delete error:", err)
    return c.json({ error: err.message }, 500)
  }
})

// POST /api/conversations/:id/messages — save messages (batch upsert)
conversationRoutes.post("/:id/messages", async (c) => {
  const db = getDb(c)
  if (!db) return c.json({ error: "db_unavailable" }, 503)

  const convId = c.req.param("id")
  try {
    const body = await c.req.json<{
      messages: { id: string; role: string; content: string }[]
      title?: string
      model?: string
    }>()

    // Delete old messages and insert new ones (simple full replace)
    await db.delete(chatMessages).where(eq(chatMessages.conversationId, convId))

    if (body.messages.length > 0) {
      await db.insert(chatMessages).values(
        body.messages.map((m) => ({
          id: m.id,
          conversationId: convId,
          role: m.role,
          content: m.content,
        }))
      )
    }

    // Update conversation timestamp and optionally title/model
    const updates: Record<string, any> = { updatedAt: new Date() }
    if (body.title) updates.title = body.title
    if (body.model) updates.model = body.model
    await db.update(conversations).set(updates).where(eq(conversations.id, convId))

    return c.json({ ok: true })
  } catch (err: any) {
    console.error("[conversations] save messages error:", err)
    return c.json({ error: err.message }, 500)
  }
})

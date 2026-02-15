import { Hono } from "hono"
import postgres from "postgres"

export const conversationRoutes = new Hono()

// Lazy singleton PostgreSQL connection
let _sql: ReturnType<typeof postgres> | null = null
function getSql() {
  if (_sql) return _sql
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) return null
  _sql = postgres(url, { ssl: "prefer", connection: { application_name: "synapse" } })
  return _sql
}

// Auto-migrate: create tables if they don't exist
let _migrated = false
async function ensureTables(sql: ReturnType<typeof postgres>) {
  if (_migrated) return
  await sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'anonymous',
      title TEXT NOT NULL DEFAULT 'Новый чат',
      model TEXT NOT NULL DEFAULT 'deepseek-r1',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS idx_conv_user ON conversations(user_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_msg_conv ON chat_messages(conversation_id)`
  _migrated = true
}

// GET /api/conversations — list all conversations for a user
conversationRoutes.get("/", async (c) => {
  const sql = getSql()
  if (!sql) return c.json({ error: "db_unavailable" }, 503)

  const userId = c.req.header("X-User-Id") || "anonymous"
  try {
    await ensureTables(sql)
    const rows = await sql`
      SELECT id, title, model, created_at, updated_at
      FROM conversations
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `
    return c.json(rows)
  } catch (err: any) {
    console.error("[conversations] list error:", err)
    return c.json({ error: err.message }, 500)
  }
})

// GET /api/conversations/:id/messages — get messages for a conversation
conversationRoutes.get("/:id/messages", async (c) => {
  const sql = getSql()
  if (!sql) return c.json({ error: "db_unavailable" }, 503)

  const convId = c.req.param("id")
  try {
    await ensureTables(sql)
    const rows = await sql`
      SELECT id, role, content, created_at
      FROM chat_messages
      WHERE conversation_id = ${convId}
      ORDER BY created_at ASC
    `
    console.log(`[conversations] load messages convId=${convId} count=${rows.length}`)
    return c.json(rows)
  } catch (err: any) {
    console.error("[conversations] messages error:", err)
    return c.json({ error: err.message }, 500)
  }
})

// POST /api/conversations — create a new conversation
conversationRoutes.post("/", async (c) => {
  const sql = getSql()
  if (!sql) return c.json({ error: "db_unavailable" }, 503)

  const userId = c.req.header("X-User-Id") || "anonymous"
  try {
    await ensureTables(sql)
    const body = await c.req.json<{ id: string; title: string; model: string }>()
    await sql`
      INSERT INTO conversations (id, user_id, title, model)
      VALUES (${body.id}, ${userId}, ${body.title}, ${body.model})
    `
    return c.json({ ok: true, id: body.id })
  } catch (err: any) {
    console.error("[conversations] create error:", err)
    return c.json({ error: err.message }, 500)
  }
})

// PUT /api/conversations/:id — update title/model
conversationRoutes.put("/:id", async (c) => {
  const sql = getSql()
  if (!sql) return c.json({ error: "db_unavailable" }, 503)

  const convId = c.req.param("id")
  try {
    await ensureTables(sql)
    const body = await c.req.json<{ title?: string; model?: string }>()

    if (body.title !== undefined && body.model !== undefined) {
      await sql`UPDATE conversations SET title = ${body.title}, model = ${body.model}, updated_at = NOW() WHERE id = ${convId}`
    } else if (body.title !== undefined) {
      await sql`UPDATE conversations SET title = ${body.title}, updated_at = NOW() WHERE id = ${convId}`
    } else if (body.model !== undefined) {
      await sql`UPDATE conversations SET model = ${body.model}, updated_at = NOW() WHERE id = ${convId}`
    }
    return c.json({ ok: true })
  } catch (err: any) {
    console.error("[conversations] update error:", err)
    return c.json({ error: err.message }, 500)
  }
})

// DELETE /api/conversations/:id — delete conversation and its messages (CASCADE handles messages)
conversationRoutes.delete("/:id", async (c) => {
  const sql = getSql()
  if (!sql) return c.json({ error: "db_unavailable" }, 503)

  const convId = c.req.param("id")
  try {
    await ensureTables(sql)
    await sql`DELETE FROM conversations WHERE id = ${convId}`
    return c.json({ ok: true })
  } catch (err: any) {
    console.error("[conversations] delete error:", err)
    return c.json({ error: err.message }, 500)
  }
})

// POST /api/conversations/:id/messages — save messages (full replace)
conversationRoutes.post("/:id/messages", async (c) => {
  const sql = getSql()
  if (!sql) return c.json({ error: "db_unavailable" }, 503)

  const convId = c.req.param("id")
  try {
    await ensureTables(sql)
    const body = await c.req.json<{
      messages: { id: string; role: string; content: string }[]
      title?: string
      model?: string
    }>()

    console.log(`[conversations] save messages convId=${convId} count=${body.messages.length} title=${body.title ?? "(none)"}`)

    // Ensure conversation exists (prevents FK violation from race condition)
    const title = body.title || "Новый чат"
    const model = body.model || "deepseek-r1"
    await sql`
      INSERT INTO conversations (id, user_id, title, model)
      VALUES (${convId}, 'anonymous', ${title}, ${model})
      ON CONFLICT (id) DO NOTHING
    `

    // Delete old messages and insert new ones
    await sql`DELETE FROM chat_messages WHERE conversation_id = ${convId}`

    if (body.messages.length > 0) {
      await sql`
        INSERT INTO chat_messages ${sql(
          body.messages.map((m) => ({
            id: m.id,
            conversation_id: convId,
            role: m.role,
            content: m.content,
          }))
        )}
      `
    }

    // Update conversation timestamp and optionally title/model
    if (body.title && body.model) {
      await sql`UPDATE conversations SET title = ${body.title}, model = ${body.model}, updated_at = NOW() WHERE id = ${convId}`
    } else if (body.title) {
      await sql`UPDATE conversations SET title = ${body.title}, updated_at = NOW() WHERE id = ${convId}`
    } else if (body.model) {
      await sql`UPDATE conversations SET model = ${body.model}, updated_at = NOW() WHERE id = ${convId}`
    } else {
      await sql`UPDATE conversations SET updated_at = NOW() WHERE id = ${convId}`
    }

    console.log(`[conversations] saved OK convId=${convId}`)
    return c.json({ ok: true })
  } catch (err: any) {
    console.error("[conversations] save messages error:", err)
    return c.json({ error: err.message }, 500)
  }
})

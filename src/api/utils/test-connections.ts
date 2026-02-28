/**
 * Infrastructure Health Check — validates all external service connections.
 * Run: npx tsx src/api/utils/test-connections.ts
 *
 * Checks:
 *  1. ElevenLabs API key validity + character balance
 *  2. PostgreSQL database ping
 *  3. Replicate API ping
 *
 * Flags any connection >2000ms as a hard error.
 */

import "dotenv/config"

const LATENCY_THRESHOLD_MS = 2000

interface CheckResult {
  service: string
  ok: boolean
  latencyMs: number
  detail: string
}

async function checkElevenLabs(): Promise<CheckResult> {
  const key = process.env.ELEVENLABS_API_KEY?.replace(/^["'\s]+|["'\s]+$/g, "")
  if (!key) return { service: "ElevenLabs", ok: false, latencyMs: 0, detail: "ELEVENLABS_API_KEY not set" }

  const t0 = Date.now()
  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": key },
    })
    const latencyMs = Date.now() - t0

    if (!res.ok) {
      return { service: "ElevenLabs", ok: false, latencyMs, detail: `HTTP ${res.status} — invalid API key or account issue` }
    }

    const data = await res.json() as { character_count?: number; character_limit?: number; tier?: string }
    const used = data.character_count ?? 0
    const limit = data.character_limit ?? 0
    const remaining = limit - used

    return {
      service: "ElevenLabs",
      ok: true,
      latencyMs,
      detail: `tier=${data.tier ?? "?"} balance=${remaining}/${limit} chars (${Math.round(remaining / limit * 100)}% remaining)`,
    }
  } catch (err) {
    return { service: "ElevenLabs", ok: false, latencyMs: Date.now() - t0, detail: `fetch failed: ${err instanceof Error ? err.message : err}` }
  }
}

async function checkDatabase(): Promise<CheckResult> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) return { service: "PostgreSQL", ok: false, latencyMs: 0, detail: "DATABASE_URL / POSTGRES_URL not set" }

  const t0 = Date.now()
  try {
    const postgres = (await import("postgres")).default
    const sql = postgres(url, { ssl: "prefer", connect_timeout: 5 })
    const rows = await sql`SELECT 1 AS ok`
    const latencyMs = Date.now() - t0
    await sql.end()

    return {
      service: "PostgreSQL",
      ok: rows.length > 0,
      latencyMs,
      detail: `ping OK, connection established in ${latencyMs}ms`,
    }
  } catch (err) {
    return { service: "PostgreSQL", ok: false, latencyMs: Date.now() - t0, detail: `connection failed: ${err instanceof Error ? err.message : err}` }
  }
}

async function checkReplicate(): Promise<CheckResult> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return { service: "Replicate", ok: false, latencyMs: 0, detail: "REPLICATE_API_TOKEN not set" }

  const t0 = Date.now()
  try {
    const res = await fetch("https://api.replicate.com/v1/account", {
      headers: { "Authorization": `Bearer ${token}` },
    })
    const latencyMs = Date.now() - t0

    if (!res.ok) {
      return { service: "Replicate", ok: false, latencyMs, detail: `HTTP ${res.status} — invalid token or account issue` }
    }

    const data = await res.json() as { username?: string; type?: string }
    return {
      service: "Replicate",
      ok: true,
      latencyMs,
      detail: `account=${data.username ?? "?"} type=${data.type ?? "?"}`,
    }
  } catch (err) {
    return { service: "Replicate", ok: false, latencyMs: Date.now() - t0, detail: `fetch failed: ${err instanceof Error ? err.message : err}` }
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════")
  console.log("  SYNAPSE — Infrastructure Health Check")
  console.log("═══════════════════════════════════════════════\n")

  const results = await Promise.all([
    checkElevenLabs(),
    checkDatabase(),
    checkReplicate(),
  ])

  let hasErrors = false

  for (const r of results) {
    const statusIcon = r.ok ? "✅" : "❌"
    const latencyWarning = r.latencyMs > LATENCY_THRESHOLD_MS ? ` ⚠️  SLOW (>${LATENCY_THRESHOLD_MS}ms)` : ""
    console.log(`${statusIcon} ${r.service}: ${r.detail} [${r.latencyMs}ms]${latencyWarning}`)

    if (!r.ok) hasErrors = true
    if (r.latencyMs > LATENCY_THRESHOLD_MS) {
      console.error(`   ❗ CRITICAL: ${r.service} latency ${r.latencyMs}ms exceeds ${LATENCY_THRESHOLD_MS}ms threshold`)
      hasErrors = true
    }
  }

  console.log("\n═══════════════════════════════════════════════")
  if (hasErrors) {
    console.error("❌ INFRASTRUCTURE CHECK FAILED — see errors above")
    process.exit(1)
  } else {
    console.log("✅ All services healthy")
    process.exit(0)
  }
}

main().catch((err) => {
  console.error("Health check crashed:", err)
  process.exit(1)
})

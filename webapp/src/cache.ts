import fs from 'fs'
import path from 'path'
import os from 'os'

const CACHE_BASE = path.join(os.homedir(), '.logger-cache')
const LOGGER_BASE = path.join(os.homedir(), '.logger')

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

function safeKey(id: string): string {
  return id.replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 100)
}

function readJson(filePath: string): unknown | null {
  if (!fs.existsSync(filePath)) return null
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')) } catch { return null }
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
}

export function isFresh(data: unknown, maxAgeMinutes: number): boolean {
  if (!data || typeof data !== 'object') return false
  const cachedAt = (data as Record<string, unknown>)._cachedAt
  if (!cachedAt) return false
  return Date.now() - new Date(cachedAt as string).getTime() < maxAgeMinutes * 60_000
}

export function readCalendarCache(date: string): unknown | null {
  const filePath = path.join(CACHE_BASE, 'calendar', `${date}.json`)
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

export function writeCalendarCache(date: string, data: unknown): void {
  const dir = path.join(CACHE_BASE, 'calendar')
  ensureDir(dir)
  fs.writeFileSync(path.join(dir, `${date}.json`), JSON.stringify(data, null, 2))
}

export function readLogged(): unknown[] {
  const filePath = path.join(LOGGER_BASE, 'logged.json')
  if (!fs.existsSync(filePath)) return []
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    // MCP cache_append wraps in { data: [...] } or it's the raw array
    if (Array.isArray(raw)) return raw
    if (raw.data && Array.isArray(raw.data)) return raw.data
    return []
  } catch {
    return []
  }
}

export function readLookups(type: 'accounts' | 'opportunities'): Record<string, unknown> {
  const filePath = path.join(LOGGER_BASE, 'lookups', `${type}.json`)
  if (!fs.existsSync(filePath)) return {}
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    // MCP logger-cache wraps in { data: {...} }
    if (raw.data && typeof raw.data === 'object') return raw.data
    return raw
  } catch {
    return {}
  }
}

// ── Products cache (~/.logger/products.json) ────────────────────────────────
// Reads from MCP cache first, then falls back to bundled data file
export function readProductsCache(): unknown | null {
  // MCP server stores products here
  const mcpPath = path.join(LOGGER_BASE, 'products.json')
  const mcpData = readJson(mcpPath)
  if (mcpData) {
    // MCP wraps in { data: [...] } or it may be a raw array
    const d = mcpData as Record<string, unknown>
    if (Array.isArray(d.data)) return d.data
    if (Array.isArray(mcpData)) return mcpData
  }

  // Fallback: bundled data shipped with the repo (always present after install)
  const bundledPath = path.join(os.homedir(), 'mcp-servers', 'logger-cache', 'data', 'products.json')
  const bundled = readJson(bundledPath)
  if (bundled) return bundled

  return null
}

export function writeProductsCache(data: unknown): void {
  ensureDir(LOGGER_BASE)
  writeJson(path.join(LOGGER_BASE, 'products.json'), {
    _cachedAt: new Date().toISOString(),
    _key: 'products',
    data,
  })
}

// ── Requests cache (~/.logger-cache/requests.json) ──────────────────────────
export function readRequestsCache(): unknown | null {
  return readJson(path.join(CACHE_BASE, 'requests.json'))
}
export function writeRequestsCache(data: unknown): void {
  ensureDir(CACHE_BASE)
  writeJson(path.join(CACHE_BASE, 'requests.json'), data)
}

// ── Engagements cache (~/.logger-cache/engagements/{key}.json) ──────────────
export function readEngagementsCache(id: string): unknown | null {
  return readJson(path.join(CACHE_BASE, 'engagements', `${safeKey(id)}.json`))
}
export function writeEngagementsCache(id: string, data: unknown): void {
  ensureDir(path.join(CACHE_BASE, 'engagements'))
  writeJson(path.join(CACHE_BASE, 'engagements', `${safeKey(id)}.json`), data)
}

// ── AI Summary cache (~/.logger-cache/aisummary/{key}.json) ─────────────────
export function readAISummaryCache(oppOdataId: string): unknown | null {
  return readJson(path.join(CACHE_BASE, 'aisummary', `${safeKey(oppOdataId)}.json`))
}
export function writeAISummaryCache(oppOdataId: string, data: unknown): void {
  ensureDir(path.join(CACHE_BASE, 'aisummary'))
  writeJson(path.join(CACHE_BASE, 'aisummary', `${safeKey(oppOdataId)}.json`), data)
}

// ── Timeline notes cache (~/.logger-cache/timeline/{key}.json) ───────────────
export function readTimelineCache(engOdataId: string): unknown | null {
  return readJson(path.join(CACHE_BASE, 'timeline', `${safeKey(engOdataId)}.json`))
}
export function writeTimelineCache(engOdataId: string, data: unknown): void {
  ensureDir(path.join(CACHE_BASE, 'timeline'))
  writeJson(path.join(CACHE_BASE, 'timeline', `${safeKey(engOdataId)}.json`), data)
}

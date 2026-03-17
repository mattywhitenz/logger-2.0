import { Router, Request, Response } from 'express'
import { readConfig } from '../config.js'
import { loggerPost } from '../logger-api.js'
import { readTimelineCache, writeTimelineCache, isFresh } from '../cache.js'

const router = Router()

const TIMELINE_TTL_MINUTES = 24 * 60

function parseNotes(output: string): { title: string; date: string; text: string }[] {
  // Split on lines of 3+ dashes
  const chunks = output.split(/\n-{3,}\n/).map((c) => c.trim()).filter(Boolean)
  return chunks.map((chunk) => {
    const titleMatch = chunk.match(/title[:\s]+'?([^'\n]+)'?/i)
    const dateMatch = chunk.match(/(?:createdon|date|created)[:\s]+'?([^'\n]+)'?/i)
    // Everything after the first blank line is the note body
    const bodyStart = chunk.indexOf('\n\n')
    const text = bodyStart !== -1 ? chunk.slice(bodyStart).trim() : chunk
    return {
      title: titleMatch?.[1]?.trim() ?? '',
      date: dateMatch?.[1]?.trim() ?? '',
      text,
    }
  })
}

router.get('/', async (req: Request, res: Response) => {
  const engOdataId = req.query.engOdataId as string
  const forceRefresh = req.query._r === '1'

  if (!engOdataId) {
    res.status(400).json({ error: 'engOdataId required' })
    return
  }

  if (!forceRefresh) {
    const cached = readTimelineCache(engOdataId)
    if (cached && isFresh(cached, TIMELINE_TTL_MINUTES)) {
      res.json(cached)
      return
    }
  }

  const config = readConfig()
  if (!config) {
    res.status(503).json({ error: 'not_configured' })
    return
  }

  try {
    const raw = await loggerPost('timeline_notes_by_engagementid', { id: engOdataId }, config.apiKey) as { output?: string }
    const output = raw.output ?? ''
    const notes = parseNotes(output)
    const result = { notes, raw: output, _cachedAt: new Date().toISOString() }
    writeTimelineCache(engOdataId, result)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(502).json({ error: 'fetch_failed', message })
  }
})

export default router

import { Router, Request, Response } from 'express'
import { readConfig } from '../config.js'
import { loggerPost } from '../logger-api.js'
import { readAISummaryCache, writeAISummaryCache, isFresh } from '../cache.js'

const router = Router()

const AISUMMARY_TTL_MINUTES = 24 * 60 // 24 hours

router.get('/', async (req: Request, res: Response) => {
  const config = readConfig()
  if (!config) {
    res.status(503).json({ error: 'not_configured' })
    return
  }

  const oppOdataId = req.query.oppOdataId as string
  const forceRefresh = req.query._r === '1'

  if (!oppOdataId) {
    res.status(400).json({ error: 'oppOdataId required' })
    return
  }

  // Serve from cache if fresh (AI summaries are expensive — cache for 24h)
  if (!forceRefresh) {
    const cached = readAISummaryCache(oppOdataId)
    if (cached && isFresh(cached, AISUMMARY_TTL_MINUTES)) {
      res.json(cached)
      return
    }
  }

  try {
    const raw = await loggerPost('get_opp_aisummary_by_id', { id: oppOdataId }, config.apiKey) as { items?: string; response?: string }
    const summary = raw.response ?? raw.items ?? JSON.stringify(raw)
    const result = { summary, _cachedAt: new Date().toISOString() }
    writeAISummaryCache(oppOdataId, result)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(502).json({ error: 'fetch_failed', message })
  }
})

export default router

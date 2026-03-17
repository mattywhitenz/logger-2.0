import { Router, Request, Response } from 'express'
import { readConfig } from '../config.js'
import { loggerPost } from '../logger-api.js'
import { readEngagementsCache, writeEngagementsCache, isFresh } from '../cache.js'

const router = Router()

const ENGAGEMENTS_TTL_MINUTES = 24 * 60 // 24 hours

router.get('/', async (req: Request, res: Response) => {
  const config = readConfig()
  if (!config) {
    res.status(503).json({ error: 'not_configured' })
    return
  }

  const oppOdataId = req.query.oppOdataId as string
  const accountOdataId = req.query.accountOdataId as string
  const forceRefresh = req.query._r === '1'

  if (!oppOdataId && !accountOdataId) {
    res.status(400).json({ error: 'oppOdataId or accountOdataId required' })
    return
  }

  const cacheKey = oppOdataId || accountOdataId

  // Serve from cache if fresh
  if (!forceRefresh) {
    const cached = readEngagementsCache(cacheKey)
    if (cached && isFresh(cached, ENGAGEMENTS_TTL_MINUTES)) {
      res.json(cached)
      return
    }
  }

  try {
    const action = oppOdataId ? 'list_engagements_by_opp_id' : 'engagements_by_accountid'
    const body = oppOdataId ? { Id: oppOdataId } : { id: accountOdataId }

    const raw = await loggerPost(action, body, config.apiKey) as { output?: string }
    const output = raw.output ?? ''

    const engagementChunks = output
      .split(/\s+---\s+/)
      .filter((c) => c.includes('engagementnumber'))

    function extractField(text: string, key: string): string {
      const m = text.match(new RegExp(`${key} '([^']*)'`))
      return m?.[1] ?? ''
    }

    const engagements = engagementChunks.map((chunk) => ({
      odataId: extractField(chunk, 'odataid'),
      engNum: extractField(chunk, 'engagementnumber'),
      name: extractField(chunk, 'name'),
      status: extractField(chunk, 'statusformatted'),
      type: extractField(chunk, 'engagementtype'),
      product: extractField(chunk, 'primaryproduct'),
      owner: extractField(chunk, 'owner'),
      salesStage: extractField(chunk, 'salesstage'),
      modified: extractField(chunk, 'modified'),
    }))

    const result = { engagements, output, _cachedAt: new Date().toISOString() }
    writeEngagementsCache(cacheKey, result)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(502).json({ error: 'fetch_failed', message })
  }
})

export default router

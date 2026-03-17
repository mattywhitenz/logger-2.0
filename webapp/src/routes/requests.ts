import { Router, Request, Response } from 'express'
import { readConfig } from '../config.js'
import { loggerPost } from '../logger-api.js'
import { readRequestsCache, writeRequestsCache, isFresh } from '../cache.js'

const router = Router()

const REQUESTS_TTL_MINUTES = 10

router.get('/', async (req: Request, res: Response) => {
  const config = readConfig()
  if (!config) {
    res.status(503).json({ error: 'not_configured' })
    return
  }

  if (!config.abilities?.includes('requests')) {
    res.status(403).json({ error: 'no_ability', message: 'requests ability not enabled' })
    return
  }

  const forceRefresh = req.query._r === '1'

  // Serve from cache if fresh
  if (!forceRefresh) {
    const cached = readRequestsCache()
    if (cached && isFresh(cached, REQUESTS_TTL_MINUTES)) {
      res.json(cached)
      return
    }
  }

  const name = [config.firstName, config.lastName].filter(Boolean).join(' ') || config.email

  try {
    const raw = await loggerPost('request_by_user', { scfullname: name }, config.apiKey) as {
      response?: string
    }

    const text = raw.response ?? JSON.stringify(raw)

    // Split on any line that is only dashes (3+), trim each block
    const allBlocks = text
      .split(/\r?\n[ \t]*-{3,}[ \t]*(?:\r?\n|$)/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0)

    // Block[0] contains the profile JSON immediately followed by request 1 (no --- between them)
    let requestBlocks = allBlocks
    if (allBlocks[0]?.trimStart().startsWith('{')) {
      const firstBlock = allBlocks[0]
      const jsonEnd = firstBlock.indexOf('}\n')
      const afterJson = jsonEnd !== -1 ? firstBlock.slice(jsonEnd + 2).trimStart() : ''
      const firstRequest = afterJson.replace(/^\(if nothing.*?\)\s*/i, '').trim()
      requestBlocks = firstRequest
        ? [firstRequest, ...allBlocks.slice(1)]
        : allBlocks.slice(1)
    }

    const result = { blocks: requestBlocks, _cachedAt: new Date().toISOString() }
    writeRequestsCache(result)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(502).json({ error: 'fetch_failed', message })
  }
})

export default router

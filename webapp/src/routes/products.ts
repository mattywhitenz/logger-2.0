import { Router, Request, Response } from 'express'
import { readConfig } from '../config.js'
import { loggerPost } from '../logger-api.js'
import { readProductsCache, writeProductsCache } from '../cache.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const forceRefresh = req.query._r === '1'

  // Serve from cache if available (products change rarely — yearly TTL in MCP)
  if (!forceRefresh) {
    const cached = readProductsCache()
    if (cached) {
      res.json({ products: cached, source: 'cache' })
      return
    }
  }

  // No cache — fetch live
  const config = readConfig()
  if (!config) {
    res.status(503).json({ error: 'not_configured' })
    return
  }

  try {
    const raw = await loggerPost('product_list', {}, config.apiKey) as unknown[]
    const products = Array.isArray(raw) ? raw : []
    writeProductsCache(products)
    res.json({ products, source: 'live' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(502).json({ error: 'fetch_failed', message })
  }
})

export default router

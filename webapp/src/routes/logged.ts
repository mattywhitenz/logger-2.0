import { Router, Request, Response } from 'express'
import { readConfig } from '../config.js'
import { readLogged } from '../cache.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const config = readConfig()
  if (!config) {
    res.status(503).json({ error: 'not_configured' })
    return
  }

  const entries = readLogged()
  res.json({ entries })
})

export default router

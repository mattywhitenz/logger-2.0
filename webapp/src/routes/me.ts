import { Router, Request, Response } from 'express'
import { readConfig } from '../config.js'
import { loggerPost } from '../logger-api.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const config = readConfig()
  if (!config) {
    res.status(503).json({ error: 'not_configured' })
    return
  }

  // Fetch abilities from handshake
  let abilities = config.abilities ?? ''
  let version = config.version ?? ''

  try {
    const data = await loggerPost('user_abilities_and_version_control', {}, config.apiKey) as Record<string, string>
    abilities = data['user abilities'] ?? abilities
    version = data['version'] ?? version
  } catch {
    // Use cached values if handshake fails
  }

  // Return everything except apiKey
  const { apiKey: _apiKey, ...safeConfig } = config
  void _apiKey
  res.json({ ...safeConfig, abilities, version })
})

export default router

import { Router, Request, Response } from 'express'
import { readLookups } from '../cache.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const raw = readLookups('accounts')
  const items = Object.entries(raw).map(([name, val]) => {
    const v = val as Record<string, unknown>
    return {
      name,
      odataId: (v.odataId ?? v.odataid ?? '') as string,
      lastSeen: (v.lastSeen ?? '') as string,
    }
  }).sort((a, b) => {
    // Most recently seen first
    if (a.lastSeen && b.lastSeen) return b.lastSeen.localeCompare(a.lastSeen)
    return a.name.localeCompare(b.name)
  })

  res.json({ items })
})

export default router

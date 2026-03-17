import { Router, Request, Response } from 'express'
import { readConfig } from '../config.js'
import { readLookups } from '../cache.js'

const router = Router()

router.get('/', (_req: Request, res: Response) => {
  const config = readConfig()
  if (!config) {
    res.status(503).json({ error: 'not_configured' })
    return
  }

  const opportunities = readLookups('opportunities')
  const accounts = readLookups('accounts')

  const items = Object.entries(opportunities).map(([oppNum, opp]) => {
    const oppData = opp as Record<string, unknown>
    const accountName = oppData.accountName as string | undefined
    const accountData = accountName ? (accounts[accountName] as Record<string, unknown> | undefined) : undefined

    return {
      oppNum,
      odataId: oppData.odataId,
      accountName,
      status: oppData.status,
      lastSeen: oppData.lastSeen,
      accountOdataId: accountData?.odataId,
    }
  })

  // Sort by lastSeen descending
  items.sort((a, b) => {
    const aTime = a.lastSeen ? new Date(a.lastSeen as string).getTime() : 0
    const bTime = b.lastSeen ? new Date(b.lastSeen as string).getTime() : 0
    return bTime - aTime
  })

  res.json({ items, accountCount: Object.keys(accounts).length })
})

export default router

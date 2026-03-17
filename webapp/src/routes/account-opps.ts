import { Router, Request, Response } from 'express'
import { readConfig } from '../config.js'
import { loggerPost } from '../logger-api.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  const config = readConfig()
  if (!config) {
    res.status(503).json({ error: 'not_configured' })
    return
  }

  const accountOdataId = req.query.accountOdataId as string
  if (!accountOdataId) {
    res.status(400).json({ error: 'accountOdataId required' })
    return
  }

  try {
    const raw = await loggerPost('opptys_by_accountid', { id: accountOdataId }, config.apiKey) as Record<string, unknown>

    // API returns {"Output": "..."} — also handle lowercase / other field names
    const output = String(raw.Output ?? raw.output ?? raw.response ?? raw.items ?? raw.value ?? '')

    function extractField(text: string, ...keys: string[]): string {
      for (const key of keys) {
        // Try 'key' format (single-quoted value)
        const mq = text.match(new RegExp(`${key}\\s+'([^']*)'`, 'i'))
        if (mq?.[1]) return mq[1]
        // Try key: value format
        const mc = text.match(new RegExp(`${key}[:\\s]+([^\\n|]+)`, 'i'))
        if (mc?.[1]?.trim()) return mc[1].trim()
      }
      return ''
    }

    // Split by common delimiters (---, |, or double newlines)
    const rawChunks = output
      .split(/\s*---\s*|\n{2,}/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0)

    // A chunk is relevant if it contains an OPTY number or opp-related keywords
    const oppChunks = rawChunks.filter((c) =>
      /OPTY\d+/i.test(c) || /opportunitynumber|oppnumber|opportunity.?id/i.test(c)
    )

    const opportunities = oppChunks.map((chunk) => {
      const oppNumMatch = chunk.match(/OPTY\d+/i)
      const oppNum = (oppNumMatch?.[0] ?? extractField(chunk, 'opportunitynumber', 'oppnumber', 'number')).toUpperCase()
      return {
        oppNum,
        name: extractField(chunk, 'name', 'title'),
        status: extractField(chunk, 'statusformatted', 'status'),
        odataId: extractField(chunk, 'odataid', 'id'),
        salesStage: extractField(chunk, 'salesstage', 'stage'),
      }
    }).filter((o) => o.oppNum)

    res.json({ opportunities, raw: output })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[account-opps] error:', message)
    res.status(502).json({ error: 'fetch_failed', message })
  }
})

export default router

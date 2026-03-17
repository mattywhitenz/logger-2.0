import { Router, Request, Response } from 'express'
import { readConfig } from '../config.js'
import { loggerPost } from '../logger-api.js'
import { readCalendarCache, writeCalendarCache, readLogged } from '../cache.js'

const router = Router()


interface CalendarItem {
  start: string
  end: string
  attendees: string
  subject: string
  categories: string
  isEngagement: boolean
  loggedEntry?: unknown
}

router.get('/', async (req: Request, res: Response) => {
  const config = readConfig()
  if (!config) {
    res.status(503).json({ error: 'not_configured' })
    return
  }

  const date = (req.query.date as string) || new Date().toISOString().split('T')[0]

  try {
    // Always fetch live
    const raw = await loggerPost(
      'calendar_this_week',
      {
        start: `${date}T00:00:00.0000000`,
        end: `${date}T23:59:59.9999999`,
      },
      config.apiKey
    )

    // Handle various response shapes from Power Automate
    let itemArray: unknown[]
    if (Array.isArray(raw)) {
      itemArray = raw
    } else if (raw && typeof raw === 'object') {
      const r = raw as Record<string, unknown>
      const candidate = r.value ?? r.items ?? r.output ?? r.response ?? r.data
      itemArray = Array.isArray(candidate) ? candidate : []
    } else {
      itemArray = []
    }

    const logged = readLogged() as Array<{ appointmentStart?: string; subject?: string; engagementNumber?: string }>

    // The API is queried for the exact date range so we trust all returned items.
    // No date filtering here — it only ever drops valid appointments.
    const items: CalendarItem[] = itemArray.map((item) => {
      const it = item as Record<string, unknown>

      // Some connectors return nested { dateTime, timeZone } objects (Graph API format)
      const extractStr = (val: unknown): string => {
        if (!val) return ''
        if (typeof val === 'string') return val
        if (typeof val === 'object') {
          const v = val as Record<string, unknown>
          return String(v.dateTime ?? v.DateTime ?? v.date ?? v.Date ?? '')
        }
        return ''
      }

      // Normalize field names (API may return PascalCase or camelCase)
      const start = extractStr(it.start ?? it.Start ?? it.startTime ?? it.StartTime ?? it.dtstart ?? '')
      const end = extractStr(it.end ?? it.End ?? it.endTime ?? it.EndTime ?? it.dtend ?? it.endDateTime ?? it.EndDateTime ?? '')
      const subject = (it.subject ?? it.Subject ?? it.title ?? it.Title ?? '') as string
      const attendees = (it.attendees ?? it.Attendees ?? it.attendeeList ?? '') as string
      const categories = (it.categories ?? it.Categories ?? it.category ?? '') as string
      const isEngagement = categories.toLowerCase().includes('engagement')
      const loggedEntry = logged.find(
        (l) => l.appointmentStart === start && l.subject === subject
      )
      return { start, end, subject, attendees, categories, isEngagement, loggedEntry }
    })

    // Sort by start time chronologically (engagement highlighting done client-side)
    items.sort((a, b) => a.start.localeCompare(b.start))

    // Cache for logged tracking
    writeCalendarCache(date, { date, items, _cachedAt: new Date().toISOString() })

    res.json({ date, items })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(502).json({ error: 'fetch_failed', message })
  }
})

export default router

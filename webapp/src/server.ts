import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import path from 'path'
import { randomUUID } from 'crypto'
import { initBridge, runChat, killSession, interruptSession } from './claude-bridge.js'
import meRouter from './routes/me.js'
import calendarRouter from './routes/calendar.js'
import requestsRouter from './routes/requests.js'
import loggedRouter from './routes/logged.js'
import opportunitiesRouter from './routes/opportunities.js'
import engagementsRouter from './routes/engagements.js'
import aisummaryRouter from './routes/aisummary.js'
import productsRouter from './routes/products.js'
import accountsRouter from './routes/accounts.js'
import timelineRouter from './routes/timeline.js'
import accountOppsRouter from './routes/account-opps.js'

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws/chat' })

app.use(cors())
app.use(express.json())

// API routes
app.use('/api/me', meRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/requests', requestsRouter)
app.use('/api/logged', loggedRouter)
app.use('/api/opportunities', opportunitiesRouter)
app.use('/api/engagements', engagementsRouter)
app.use('/api/aisummary', aisummaryRouter)
app.use('/api/products', productsRouter)
app.use('/api/accounts', accountsRouter)
app.use('/api/timeline', timelineRouter)
app.use('/api/account-opps', accountOppsRouter)

// Serve built client in production
const clientDist = path.join(__dirname, '..', 'dist', 'client')
app.use(express.static(clientDist))
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

// WebSocket chat handler
wss.on('connection', (ws: WebSocket) => {
  const sessionId = randomUUID()

  ws.on('message', (raw) => {
    let message: string
    try {
      const parsed = JSON.parse(raw.toString()) as { type?: string; message?: string }
      if (parsed.type === 'interrupt') {
        interruptSession(sessionId)
        ws.send(JSON.stringify({ type: 'interrupted' }))
        return
      }
      message = parsed.message ?? raw.toString()
    } catch {
      message = raw.toString()
    }

    runChat(sessionId, message, (event, data) => {
      if (ws.readyState !== WebSocket.OPEN) return

      if (event === 'delta') {
        ws.send(JSON.stringify({ type: 'delta', text: data }))
      } else if (event === 'done') {
        ws.send(JSON.stringify({ type: 'done' }))
      } else if (event === 'error') {
        ws.send(JSON.stringify({ type: 'error', text: data }))
      }
    })
  })

  ws.on('close', () => {
    killSession(sessionId)
  })
})

// Init bridge (writes mcp-servers.json)
initBridge()

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001
server.listen(PORT, () => {
  console.log(`Logger server running on http://localhost:${PORT}`)
})

import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { readConfig } from './config.js'

const HOME = os.homedir()
const REPO_ROOT = path.resolve(path.join(import.meta.dirname ?? __dirname, '..', '..'))
const MCP_CONFIG_PATH = path.join(REPO_ROOT, 'webapp', 'mcp-servers.json')
const MAX_HISTORY_TURNS = 20

interface Turn {
  role: 'user' | 'assistant'
  content: string
}

const sessions = new Map<string, Turn[]>()
const activeProcesses = new Map<string, ChildProcess>()

function resolveClaude(): string {
  const candidates = [
    // Same bin dir as the running Node (covers nvm, fnm, volta, etc.)
    path.join(path.dirname(process.execPath), 'claude'),
    path.join(HOME, '.local', 'bin', 'claude'),
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    'claude',
  ]
  for (const c of candidates) {
    if (c === 'claude') return c
    if (fs.existsSync(c)) return c
  }
  return 'claude'
}

function writeMcpConfig(): void {
  const config = {
    mcpServers: {
      'http-client': {
        command: 'node',
        args: [path.join(HOME, 'mcp-servers', 'http-client', 'dist', 'index.js')],
      },
      'logger-cache': {
        command: 'node',
        args: [
          path.join(HOME, 'mcp-servers', 'logger-cache', 'dist', 'index.js'),
          path.join(HOME, '.logger'),
        ],
      },
    },
  }
  fs.writeFileSync(MCP_CONFIG_PATH, JSON.stringify(config, null, 2))
}

function buildWebContext(): string {
  const config = readConfig()
  const name = config?.firstName ? `${config.firstName} ${config.lastName ?? ''}`.trim() : config?.email ?? 'unknown'
  const abilities = config?.abilities ?? 'calendar, requests, engagements'
  const odataid = config?.odataid ?? ''
  const email = config?.email ?? ''
  const apiKey = config?.apiKey ?? ''

  return `<web_ui_context>
You are running inside the Logger Web UI (a browser app). The startup sequence has ALREADY been completed. Do NOT run the startup handshake, do NOT call user_abilities_and_version_control or user_lookup again, and do NOT display the ASCII art frog/logo.

Current user: ${name}
Email: ${email}
User odataid: ${odataid}
Abilities: ${abilities}
API key: ${apiKey}

CRITICAL — EVERY http_request to the Power Automate webhook MUST include the API key in the body, no exceptions:
{
  "action": "<action_name>",
  "headers": { "id": "${apiKey}" },
  "body": { ... }
}

If you omit "headers": { "id": "${apiKey}" } from any request, it will fail with a 401. Always include it. Always.

PRODUCTS — NEVER call the product_list webhook. The product list is pre-cached and returns too much data to process inline. Always use cache_get("products") to retrieve products. If the cache is empty, tell the user to type #products in the desktop app to warm the cache first.

Respond directly to the user's request. Skip all startup preamble.
</web_ui_context>`
}

function buildPrompt(sessionId: string, userMessage: string): string {
  const webContext = buildWebContext()
  const history = sessions.get(sessionId) ?? []
  const recentHistory = history.slice(-MAX_HISTORY_TURNS * 2)

  if (recentHistory.length === 0) {
    return `${webContext}\n\n${userMessage}`
  }

  const historyXml = recentHistory
    .map((t) => `<${t.role}>${t.content}</${t.role}>`)
    .join('\n')

  return `${webContext}\n\n<conversation_history>\n${historyXml}\n</conversation_history>\n\n${userMessage}`
}

export function checkMcpServers(): { ok: boolean; missing: string[] } {
  const required = [
    path.join(HOME, 'mcp-servers', 'http-client', 'dist', 'index.js'),
    path.join(HOME, 'mcp-servers', 'logger-cache', 'dist', 'index.js'),
  ]
  const missing = required.filter((p) => !fs.existsSync(p))
  return { ok: missing.length === 0, missing }
}

export function initBridge(): void {
  writeMcpConfig()
}

export function killSession(sessionId: string): void {
  const proc = activeProcesses.get(sessionId)
  if (proc) {
    proc.kill()
    activeProcesses.delete(sessionId)
  }
  sessions.delete(sessionId)
}

// Interrupt the active process for a session but keep history intact
export function interruptSession(sessionId: string): void {
  const proc = activeProcesses.get(sessionId)
  if (proc) {
    proc.kill()
    activeProcesses.delete(sessionId)
  }
}

export type StreamCallback = (event: 'delta' | 'done' | 'error', data: string) => void

export function runChat(sessionId: string, userMessage: string, onStream: StreamCallback): void {
  const { ok, missing } = checkMcpServers()
  if (!ok) {
    onStream(
      'error',
      `⚠️ MCP servers not found. Run \`#upgrade\` in Claude Code first.\nMissing: ${missing.join(', ')}`
    )
    return
  }

  const fullPrompt = buildPrompt(sessionId, userMessage)
  const claudePath = resolveClaude()

  const allowedTools = [
    'mcp__http-client__http_request',
    'mcp__logger-cache__cache_get',
    'mcp__logger-cache__cache_write',
    'mcp__logger-cache__cache_append',
    'mcp__logger-cache__cache_lookup',
    'mcp__logger-cache__cache_lookup_add',
    'mcp__logger-cache__cache_lookup_remove',
    'mcp__logger-cache__cache_list',
    'mcp__logger-cache__cache_delete',
    'Read',
  ].join(',')

  const args = [
    '--print',
    '--verbose',
    '--output-format', 'stream-json',
    '--dangerously-skip-permissions',
    '--no-session-persistence',
    '--mcp-config', MCP_CONFIG_PATH,
    '--strict-mcp-config',
    '--allowedTools', allowedTools,
    '--',
    fullPrompt,
  ]

  // Strip CLAUDECODE so the child process doesn't detect a nested session
  const cleanEnv = { ...process.env }
  delete cleanEnv.CLAUDECODE

  console.log('[claude-bridge] spawning:', claudePath, args.slice(0, -1).join(' '), '(prompt omitted)')

  const proc = spawn(claudePath, args, {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...cleanEnv,
      PATH: `${HOME}/.local/bin:/usr/local/bin:/opt/homebrew/bin:${cleanEnv.PATH ?? ''}`,
    },
  })

  activeProcesses.set(sessionId, proc)

  let assistantReply = ''
  let buffer = ''
  let prevAssistantText = ''

  proc.stdout.on('data', (chunk: Buffer) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.trim()) continue
      console.log('[claude-bridge stdout]', line.slice(0, 300))

      try {
        const event = JSON.parse(line) as Record<string, unknown>
        const type = event.type as string

        // API streaming format (stream-json with --include-partial-messages)
        if (type === 'content_block_delta') {
          const delta = event.delta as Record<string, unknown> | undefined
          if (delta?.type === 'text_delta') {
            const text = delta.text as string
            assistantReply += text
            prevAssistantText = assistantReply
            onStream('delta', text)
          }
        }

        // CLI wrapper format: assistant event with accumulated content
        if (type === 'assistant') {
          const msg = event.message as { content?: Array<{ type: string; text?: string }> } | undefined
          const textBlock = msg?.content?.find((c) => c.type === 'text')
          const fullText = textBlock?.text ?? ''
          const delta = fullText.slice(prevAssistantText.length)
          if (delta) {
            assistantReply = fullText
            prevAssistantText = fullText
            onStream('delta', delta)
          }
        }

        // Final result — use as fallback if nothing was streamed
        if (type === 'result') {
          const resultText = event.result as string | undefined
          if (resultText && !assistantReply) {
            assistantReply = resultText
            onStream('delta', resultText)
          }
        }
      } catch {
        // Non-JSON line — ignore
      }
    }
  })

  proc.stderr.on('data', (chunk: Buffer) => {
    console.error('[claude-bridge stderr]', chunk.toString().slice(0, 500))
  })

  proc.on('close', (code) => {
    activeProcesses.delete(sessionId)

    // Update session history
    const history = sessions.get(sessionId) ?? []
    history.push({ role: 'user', content: userMessage })
    if (assistantReply) {
      history.push({ role: 'assistant', content: assistantReply })
    }
    // Cap history
    const trimmed = history.slice(-MAX_HISTORY_TURNS * 2)
    sessions.set(sessionId, trimmed)

    if (code !== 0 && !assistantReply) {
      onStream('error', `⚠️ Claude exited with code ${code}. Check that \`claude\` is in your PATH.`)
    } else {
      onStream('done', '')
    }
  })

  proc.on('error', (err) => {
    activeProcesses.delete(sessionId)
    onStream('error', `⚠️ Failed to spawn Claude: ${err.message}`)
  })
}

import fs from 'fs'
import path from 'path'
import os from 'os'

export interface LoggerConfig {
  apiKey: string
  email: string
  odataid?: string
  firstName?: string
  lastName?: string
  title?: string
  regionName?: string
  managerName?: string
  abilities?: string
  version?: string
}

export function readConfig(): LoggerConfig | null {
  const primaryPath = path.join(os.homedir(), '.logger-config')
  const fallbackPath = path.join(os.homedir(), '.logger', 'config.json')

  // Try primary ~/.logger-config (flat JSON)
  if (fs.existsSync(primaryPath)) {
    try {
      const raw = fs.readFileSync(primaryPath, 'utf8')
      const data = JSON.parse(raw)
      if (data.apiKey && data.email) {
        return data as LoggerConfig
      }
    } catch {
      // fall through to fallback
    }
  }

  // Try fallback ~/.logger/config.json (MCP-wrapped format)
  if (fs.existsSync(fallbackPath)) {
    try {
      const raw = fs.readFileSync(fallbackPath, 'utf8')
      const outer = JSON.parse(raw)
      const data = outer.data ?? outer
      if (data.apiKey && data.email) {
        return data as LoggerConfig
      }
    } catch {
      // fall through
    }
  }

  return null
}

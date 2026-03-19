# Logger — Setup Guide

## Before you start

You need:
- A **Claude account** (Pro, Max, Team, or Enterprise plan)
- Your **Logger API key** — ask Matty White for this
- Your **ServiceNow email** — e.g. first.last@servicenow.com

---

## Step 1: Open your terminal

**Mac:** Spotlight (magnifying glass, top-right) → type **Terminal** → Enter
**Windows:** Start menu → type **PowerShell** → click **Windows PowerShell**

---

## Step 2: Install Node.js

Check if you already have it:
```
node --version
```

If you see a version number, skip to Step 3.

If not, install it:
- **Self Service (try first):** Open the **Self Service** app on your laptop, search for **Node.js**, click Install
- **Direct download:** Go to **https://nodejs.org**, download LTS
  - Mac: run the `.pkg` installer
  - Windows: run the `.msi` installer

After installing, **close and reopen your terminal**, then check again: `node --version`

---

## Step 3: Install Claude Code

**Mac:**
```
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows:**
```
irm https://claude.ai/install.ps1 | iex
```

Check it worked:
```
claude --version
```

---

## Step 4: First launch & sign in

Run Claude Code once to sign in and accept permissions:

```
claude
```

1. A browser window opens — sign in with your Claude/Anthropic account
2. Back in the terminal, Claude will ask about permissions — **type `y` to allow**
3. Once you see the Claude prompt, type `/exit` to quit

> **Don't have an account?** Ask Matty White — your team has enterprise seats.

You're now signed in and ready. Close this terminal window.

---

## Step 5: Store the folder

Move the `logger` folder to your **Documents** folder:
- **Mac:** `~/Documents/logger`
- **Windows:** `C:\Users\{YourName}\Documents\logger`

Don't leave it in Downloads.

---

## Step 6: Create the app shortcut

**Mac:**
```
bash ~/Documents/logger/setup-launcher-mac.sh ~/Documents/logger
```
Then drag `Logger.app` from `~/Applications/` to your Dock.

**Windows:**
```
powershell -ExecutionPolicy Bypass -File "$HOME\Documents\logger\setup-launcher-windows.ps1" -LoggerDir "$HOME\Documents\logger"
```
Then double-click the Desktop shortcut, right-click it in the Taskbar → Pin to taskbar.

---

## Step 7: First run

Click the Logger icon in your Dock/Taskbar. Then type:
```
#project:start
```

Enter your **API key** and **ServiceNow email** when prompted.

---

## Step 8: Set up Power Automate webhooks

Logger will walk you through this during first-time setup. In short:

1. Go to **https://make.powerautomate.com** — sign in with your work account
2. Go to **My flows** → **Shared with me** tab
3. Copy both shared flows (**Save As** on each):
   - **"claude- Log Timeline Item to Engagement"** (sign in to Dataverse when asked)
   - **"claude - get OL appt for the day"** (sign in to Office 365 when asked)
4. Go to the **Cloud flows** tab — open each copy, **Turn on**, then **Edit**:
   - **Outlook flow:** Click "Get events" → clear Calendar ID (X) → select Calendar from dropdown → click "Manual" → copy the HTTP URL → paste into Logger
   - **Timeline flow:** Click "Manual" → copy the HTTP URL → paste into Logger
5. Logger registers both webhooks automatically

---

## Step 9: You're done!

Type `#help` to see all available commands.

### Day-to-day use

Click the Logger icon in your Dock (Mac) or Taskbar (Windows). That's it.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `curl: command not found` | Very old macOS — update your OS or install curl |
| `irm` not recognised | Open PowerShell (not Command Prompt) and try again |
| "Unable to connect" | Check your API key — ask Matty White |
| App icon doesn't work | Open terminal manually: `cd ~/Documents/logger && claude --dangerously-skip-permissions` |
| Can't see #calendar or #requests | Per-user features — ask Matty White to enable |

---

## Factory Reset

If something is broken or you want to start fresh, follow these steps. This wipes all cached data, removes MCP servers, and resets your config so you can re-run setup from scratch.

### 1. Delete Logger cache and config

**Mac:**
```
rm -rf ~/.logger
rm -f ~/.logger-config ~/.logger-products.json ~/.logger-logged.json
rm -rf ~/.logger-cache
```

**Windows (PowerShell):**
```
Remove-Item -Recurse -Force "$env:USERPROFILE\.logger" -ErrorAction SilentlyContinue
Remove-Item -Force "$env:USERPROFILE\.logger-config" -ErrorAction SilentlyContinue
Remove-Item -Force "$env:USERPROFILE\.logger-products.json" -ErrorAction SilentlyContinue
Remove-Item -Force "$env:USERPROFILE\.logger-logged.json" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.logger-cache" -ErrorAction SilentlyContinue
```

### 2. Remove installed MCP servers

**Mac:**
```
rm -rf ~/mcp-servers/http-client
rm -rf ~/mcp-servers/logger-cache
```

**Windows (PowerShell):**
```
Remove-Item -Recurse -Force "$env:USERPROFILE\mcp-servers\http-client" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\mcp-servers\logger-cache" -ErrorAction SilentlyContinue
```

### 3. Remove MCP servers from Claude Desktop config

**Mac:**
```
CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
cp "$CONFIG" "$CONFIG.backup"
jq 'del(.mcpServers["http-client"], .mcpServers["logger-cache"])' "$CONFIG" > /tmp/claude_config_tmp.json && mv /tmp/claude_config_tmp.json "$CONFIG"
```

**Windows (PowerShell):**
```
$config = "$env:APPDATA\Claude\claude_desktop_config.json"
Copy-Item $config "$config.backup"
$json = Get-Content $config | ConvertFrom-Json
$json.mcpServers.PSObject.Properties.Remove('http-client')
$json.mcpServers.PSObject.Properties.Remove('logger-cache')
$json | ConvertTo-Json -Depth 10 | Set-Content $config
```

### 4. Restart Claude Desktop

Quit Claude Desktop completely (Cmd+Q on Mac, close from Taskbar on Windows), then reopen it.

### 5. Re-run setup

Follow the setup guide from Step 7 onward, or run `#project:setup-desktop` in Claude Code.

---

## Contact

For API keys, feature access, or any issues: **Matty White**

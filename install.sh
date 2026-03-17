#!/usr/bin/env bash
# Logger install script — sets up Logger from scratch
# Usage: bash install.sh
#
# Or run directly from GitHub:
#   git clone https://github.com/mattywhitenz/logger-2.0.git ~/logger
#   cd ~/logger && bash install.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Helpers ───────────────────────────────────────────────────────────────────
green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
bold()   { printf '\033[1m%s\033[0m\n' "$*"; }
die()    { red "❌ $*"; exit 1; }

bold ""
bold "🐸 Logger — Install"
echo ""

# ── Prerequisites ─────────────────────────────────────────────────────────────
echo "Checking prerequisites..."

command -v node >/dev/null 2>&1 || die "Node.js is required. Install from https://nodejs.org (v18+)"
NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
[ "$NODE_VER" -ge 18 ] || die "Node.js v18+ required (found v$NODE_VER)"
green "  ✅ Node.js $(node --version)"

command -v git >/dev/null 2>&1 || die "git is required."
green "  ✅ git $(git --version | awk '{print $3}')"

command -v jq >/dev/null 2>&1 || {
  yellow "  ⚠️  jq not found — installing via Homebrew..."
  command -v brew >/dev/null 2>&1 || die "Homebrew required to install jq. Get it at https://brew.sh"
  brew install jq --quiet
}
green "  ✅ jq"

# Check for claude — required to run Logger
if command -v claude >/dev/null 2>&1; then
  green "  ✅ Claude Code $(claude --version 2>/dev/null | head -1 || echo '')"
else
  yellow "  ⚠️  Claude Code not found."
  read -r -p "     Install it now via npm? [Y/n] " INSTALL_CLAUDE || true
  if [[ "$(echo "$INSTALL_CLAUDE" | tr '[:upper:]' '[:lower:]')" != "n" ]]; then
    echo "     Installing Claude Code..."
    if npm install -g @anthropic-ai/claude-code --silent; then
      green "  ✅ Claude Code installed"
      echo "     👉 Run 'claude' to log in before using Logger."
    else
      red "  ❌ Install failed. Visit https://claude.ai/code to install manually."
    fi
  else
    yellow "     Skipped. Install Claude Code later from https://claude.ai/code"
    echo "     Logger is installed but won't work until Claude Code is set up."
  fi
fi

echo ""

# ── Build MCP servers ─────────────────────────────────────────────────────────
echo "🔨 Building MCP servers..."

build_mcp() {
  local name="$1"
  local src="$REPO_DIR/mcp-servers/$name"
  local dest="$HOME/mcp-servers/$name"
  mkdir -p "$dest"
  cp -r "$src/"* "$dest/"
  (cd "$dest" && npm install --silent && npm run build --silent)
  green "  ✅ $name"
}

build_mcp "http-client"
build_mcp "logger-cache"

# Copy bundled product data
mkdir -p "$HOME/mcp-servers/logger-cache/data"
cp "$REPO_DIR/data/products.json" "$HOME/mcp-servers/logger-cache/data/"
green "  ✅ Products data seeded"

echo ""

# ── Build webapp ──────────────────────────────────────────────────────────────
echo "🌐 Building webapp..."
(cd "$REPO_DIR/webapp" && npm install --silent && npm run build --silent)
green "  ✅ Webapp built"

echo ""

# ── Configure Claude Desktop ──────────────────────────────────────────────────
echo "⚙️  Configuring Claude Desktop..."

CONFIG_DIR="$HOME/Library/Application Support/Claude"
CONFIG="$CONFIG_DIR/claude_desktop_config.json"
H="$HOME"

mkdir -p "$CONFIG_DIR"

if [ -f "$CONFIG" ]; then
  cp "$CONFIG" "$CONFIG.backup"
  jq --arg http "$H/mcp-servers/http-client/dist/index.js" \
     --arg cache "$H/mcp-servers/logger-cache/dist/index.js" \
     --arg cachedir "$H/.logger" \
     '.mcpServers["http-client"] = {"command":"node","args":[$http]} |
      .mcpServers["logger-cache"] = {"command":"node","args":[$cache,$cachedir]}' \
     "$CONFIG" > /tmp/logger_config_tmp.json && mv /tmp/logger_config_tmp.json "$CONFIG"
  green "  ✅ MCP servers added to existing Claude Desktop config"
else
  cat > "$CONFIG" << EOF
{
  "mcpServers": {
    "http-client": {
      "command": "node",
      "args": ["$H/mcp-servers/http-client/dist/index.js"]
    },
    "logger-cache": {
      "command": "node",
      "args": ["$H/mcp-servers/logger-cache/dist/index.js", "$H/.logger"]
    }
  }
}
EOF
  green "  ✅ Claude Desktop config created"
fi

echo ""

# ── Install the Logger skill ───────────────────────────────────────────────────
echo "📦 Installing Logger skill..."
SKILL="$REPO_DIR/skill/logger-engagement.skill"
if [ -f "$SKILL" ]; then
  open "$SKILL" 2>/dev/null || yellow "  ⚠️  Could not auto-open skill file. Open $SKILL manually."
  green "  ✅ Skill file opened — confirm install in Claude Desktop"
else
  yellow "  ⚠️  Skill file not found at $SKILL"
fi

echo ""

# ── Dock shortcut (optional) ──────────────────────────────────────────────────
read -r -p "📌 Create a Logger app in ~/Applications for quick Dock access? [y/N] " DOCK || true
if [[ "$(echo "$DOCK" | tr '[:upper:]' '[:lower:]')" == "y" ]]; then
  bash "$REPO_DIR/setup-launcher-mac.sh" "$REPO_DIR"
fi

echo ""

# ── Done ──────────────────────────────────────────────────────────────────────
VERSION=$(cat "$REPO_DIR/VERSION" 2>/dev/null | tr -d '[:space:]' || echo "2.0")
green "✅ Logger v$VERSION installed!"
echo ""
echo "  Next steps:"
echo "  1. Quit and reopen Claude Desktop"
echo "  2. Open a new chat and type: #start"
echo "     (It will ask for your API key and email on first run)"
echo ""
yellow "  Need an API key? Logger will request one for you automatically on first run."
echo ""

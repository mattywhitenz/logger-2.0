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

if ! command -v node >/dev/null 2>&1; then
  yellow "  ⚠️  Node.js not found — installing..."
  if command -v brew >/dev/null 2>&1; then
    brew install node --quiet
  else
    yellow "     Homebrew not found. Installing Homebrew first..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Add brew to PATH for this session (Apple Silicon default location)
    eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null || true)"
    brew install node --quiet
  fi
fi
command -v node >/dev/null 2>&1 || die "Node.js install failed. Please install manually from https://nodejs.org (v18+)"
NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
[ "$NODE_VER" -ge 18 ] || die "Node.js v18+ required (found v$NODE_VER). Download LTS from https://nodejs.org"
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
  read -r -p "     Install it now? [Y/n] " INSTALL_CLAUDE || true
  if [[ "$(echo "$INSTALL_CLAUDE" | tr '[:upper:]' '[:lower:]')" != "n" ]]; then
    echo "     Installing Claude Code..."
    if curl -fsSL https://claude.ai/install.sh | bash; then
      # Add to PATH for this session
      export PATH="$HOME/.local/bin:$PATH"
      green "  ✅ Claude Code installed"
      # Add to shell profile if not already there
      if ! grep -q '.local/bin' "$HOME/.zshrc" 2>/dev/null; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
        green "  ✅ Added to ~/.zshrc PATH"
      fi
    else
      red "  ❌ Install failed. Visit https://claude.ai/download to install manually."
    fi
  else
    yellow "     Skipped. Install Claude Code later: curl -fsSL https://claude.ai/install.sh | bash"
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
(cd "$REPO_DIR/webapp" && npm install --silent)
(cd "$REPO_DIR/webapp/client" && npm install --silent)
(cd "$REPO_DIR/webapp" && npm run build --silent)
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
  open "$HOME/Applications" 2>/dev/null || true
fi

echo ""

# ── Done ──────────────────────────────────────────────────────────────────────
VERSION=$(cat "$REPO_DIR/VERSION" 2>/dev/null | tr -d '[:space:]' || echo "2.0")
green "✅ Logger v$VERSION installed!"
echo ""

# Launch Claude Code to run first-time setup (API key, webhooks, cache warm-up)
if command -v claude >/dev/null 2>&1; then
  echo ""
  bold "🐸 Launching Logger for first-time setup..."
  echo ""
  cd "$REPO_DIR" && exec claude "#start"
else
  echo "  Next steps:"
  echo "  1. Install Claude Code: curl -fsSL https://claude.ai/install.sh | bash"
  echo "  2. Run: cd $REPO_DIR && claude"
  echo "     (It will walk you through setup on first run)"
  echo ""
fi

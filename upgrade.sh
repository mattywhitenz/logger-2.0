#!/usr/bin/env bash
# Logger upgrade script — updates to the latest version from GitHub
# Usage: bash upgrade.sh
#        bash upgrade.sh --force   (skip version check, upgrade anyway)

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
VERSION_FILE="$REPO_DIR/VERSION"
CURRENT=$(cat "$VERSION_FILE" 2>/dev/null | tr -d '[:space:]' || echo "unknown")
FORCE=${1:-}

# ── Helpers ──────────────────────────────────────────────────────────────────
green()  { printf '\033[0;32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$*"; }
red()    { printf '\033[0;31m%s\033[0m\n' "$*"; }
bold()   { printf '\033[1m%s\033[0m\n' "$*"; }

# ── Version check ─────────────────────────────────────────────────────────────
REMOTE=$(git -C "$REPO_DIR" remote get-url origin 2>/dev/null || echo "")
REPO_PATH=$(echo "$REMOTE" | sed 's|https://github.com/||;s|git@github.com:||;s|\.git$||')
LATEST=""

if [ -n "$REPO_PATH" ]; then
  LATEST=$(curl -fsSL "https://api.github.com/repos/$REPO_PATH/releases/latest" 2>/dev/null \
    | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/' || echo "")
fi

bold ""
bold "🐸 Logger Upgrade"
echo ""
echo "  Current : v$CURRENT"

if [ -n "$LATEST" ]; then
  echo "  Latest  : v$LATEST"
  echo ""
  if [ "$CURRENT" = "$LATEST" ] && [ "$FORCE" != "--force" ]; then
    green "✅ Already on the latest version (v$CURRENT). Nothing to do."
    echo ""
    echo "  Run with --force to upgrade anyway:"
    echo "  bash upgrade.sh --force"
    echo ""
    exit 0
  fi
else
  yellow "  (Could not reach GitHub — upgrading from local git anyway)"
  echo ""
fi

# ── Pull latest code ──────────────────────────────────────────────────────────
echo "📥 Pulling latest code..."
git -C "$REPO_DIR" pull origin main
echo ""

# ── Rebuild MCP servers ───────────────────────────────────────────────────────
echo "🔨 Rebuilding MCP servers..."

rebuild_mcp() {
  local name="$1"
  local src="$REPO_DIR/mcp-servers/$name"
  local dest="$HOME/mcp-servers/$name"
  mkdir -p "$dest"
  cp -r "$src/"* "$dest/"
  cd "$dest" && npm install --silent && npm run build --silent
  green "  ✅ $name"
}

rebuild_mcp "http-client"

# logger-cache also needs the bundled data
rebuild_mcp "logger-cache"
mkdir -p "$HOME/mcp-servers/logger-cache/data"
cp "$REPO_DIR/data/products.json" "$HOME/mcp-servers/logger-cache/data/"
green "  ✅ products.json updated"

echo ""

# ── Update Claude Desktop config ─────────────────────────────────────────────
CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
if [ -f "$CONFIG" ]; then
  echo "⚙️  Updating Claude Desktop config..."
  cp "$CONFIG" "$CONFIG.backup"
  H="$HOME"
  jq --arg http "$H/mcp-servers/http-client/dist/index.js" \
     --arg cache "$H/mcp-servers/logger-cache/dist/index.js" \
     --arg cachedir "$H/.logger" \
     '.mcpServers["http-client"] = {"command":"node","args":[$http]} |
      .mcpServers["logger-cache"] = {"command":"node","args":[$cache,$cachedir]}' \
     "$CONFIG" > /tmp/logger_config_tmp.json && mv /tmp/logger_config_tmp.json "$CONFIG"
  green "  ✅ Claude Desktop config updated"
  echo ""
fi

# ── Show new version ──────────────────────────────────────────────────────────
NEW_VERSION=$(cat "$VERSION_FILE" 2>/dev/null | tr -d '[:space:]' || echo "unknown")
green "✅ Logger upgraded to v$NEW_VERSION"
echo ""
yellow "  If using Claude Desktop: quit and reopen it to load the new MCP servers."
echo ""

#!/bin/bash
# Logger Launcher Setup — Mac
# Creates two apps: LoggerClaudeCode and LoggerWeb

LOGGER_DIR="$1"

if [ -z "$LOGGER_DIR" ]; then
    echo "Usage: bash setup-launcher-mac.sh /path/to/logger"
    exit 1
fi

# Resolve to absolute path
LOGGER_DIR="$(cd "$LOGGER_DIR" 2>/dev/null && pwd)"

if [ ! -f "$LOGGER_DIR/CLAUDE.md" ]; then
    echo "Error: CLAUDE.md not found in $LOGGER_DIR"
    echo "Make sure you're pointing at the logger folder."
    exit 1
fi

mkdir -p "$HOME/Applications"

# ── App 1: LoggerClaudeCode ───────────────────────────────────────────────────
CC_APP="$HOME/Applications/LoggerClaudeCode.app"
mkdir -p "$CC_APP/Contents/MacOS"
mkdir -p "$CC_APP/Contents/Resources"

cat > "$CC_APP/Contents/MacOS/launch.sh" << LAUNCH
#!/bin/bash
osascript -e 'tell application "Terminal"
    activate
    do script "cd \"$LOGGER_DIR\" && claude --dangerously-skip-permissions"
end tell'
LAUNCH
chmod +x "$CC_APP/Contents/MacOS/launch.sh"

cat > "$CC_APP/Contents/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>LoggerClaudeCode</string>
    <key>CFBundleDisplayName</key>
    <string>LoggerClaudeCode</string>
    <key>CFBundleIdentifier</key>
    <string>com.servicenow.logger.claudecode</string>
    <key>CFBundleVersion</key>
    <string>2.0</string>
    <key>CFBundleExecutable</key>
    <string>launch.sh</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
PLIST

echo "  ✅ LoggerClaudeCode.app created"

# ── App 2: LoggerWeb ──────────────────────────────────────────────────────────
WEB_APP="$HOME/Applications/LoggerWeb.app"
mkdir -p "$WEB_APP/Contents/MacOS"
mkdir -p "$WEB_APP/Contents/Resources"

cat > "$WEB_APP/Contents/MacOS/launch.sh" << LAUNCH
#!/bin/bash
LOGGER_DIR="$LOGGER_DIR"
WEBAPP_DIR="\$LOGGER_DIR/webapp"
PORT=3001

# Check if already running
if lsof -ti:"\$PORT" >/dev/null 2>&1; then
    open "http://localhost:\$PORT"
    exit 0
fi

# Start the server in background
osascript -e 'tell application "Terminal"
    activate
    do script "cd \"'"$LOGGER_DIR"'/webapp\" && npm start; exec bash"
end tell'

# Wait for server to start then open browser
sleep 3
open "http://localhost:\$PORT"
LAUNCH
chmod +x "$WEB_APP/Contents/MacOS/launch.sh"

cat > "$WEB_APP/Contents/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>LoggerWeb</string>
    <key>CFBundleDisplayName</key>
    <string>LoggerWeb</string>
    <key>CFBundleIdentifier</key>
    <string>com.servicenow.logger.web</string>
    <key>CFBundleVersion</key>
    <string>2.0</string>
    <key>CFBundleExecutable</key>
    <string>launch.sh</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
PLIST

echo "  ✅ LoggerWeb.app created"

echo ""
echo "Both apps created in ~/Applications."
echo ""
echo "To pin to your Dock:"
echo "  1. Open Finder → Go → Home → Applications"
echo "  2. Drag LoggerClaudeCode and/or LoggerWeb to your Dock"
echo ""

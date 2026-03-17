#!/bin/bash
# Logger Launcher Setup — Mac
# Run this once to create a Logger app you can pin to your Dock.

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

APP_NAME="Logger"
APP_DIR="$HOME/Applications/$APP_NAME.app"
SCRIPT_PATH="$APP_DIR/Contents/MacOS/launch.sh"

echo "Creating $APP_NAME.app..."

# Create app bundle structure
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# Create the launch script
cat > "$SCRIPT_PATH" << LAUNCH
#!/bin/bash
cd "$LOGGER_DIR"
osascript -e 'tell application "Terminal"
    activate
    do script "cd \"$LOGGER_DIR\" && claude --dangerously-skip-permissions"
end tell'
LAUNCH
chmod +x "$SCRIPT_PATH"

# Create Info.plist
cat > "$APP_DIR/Contents/Info.plist" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>Logger</string>
    <key>CFBundleDisplayName</key>
    <string>Logger</string>
    <key>CFBundleIdentifier</key>
    <string>com.servicenow.logger</string>
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

echo ""
echo "✅ Logger.app created at: $APP_DIR"
echo ""
echo "To pin to your Dock:"
echo "  1. Open Finder → Go → Home → Applications"
echo "  2. Drag Logger.app to your Dock"
echo ""
echo "Or open it now with:"
echo "  open $APP_DIR"

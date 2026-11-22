#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
export PATH="$(pwd)/node_modules/.bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
    echo "[ERROR] Node.js is not found in PATH. Please install Node.js 18+."
    exit 1
fi

SCRIPT_PATH=""
if [ -f ".agent/skills/tk_code_studio/scripts/live.mjs" ]; then
    SCRIPT_PATH=".agent/skills/tk_code_studio/scripts/live.mjs"
elif [ -f "scripts/live.mjs" ]; then
    SCRIPT_PATH="scripts/live.mjs"
elif [ -f "$HOME/.gemini/config/skills/tk_code_studio/scripts/live.mjs" ]; then
    SCRIPT_PATH="$HOME/.gemini/config/skills/tk_code_studio/scripts/live.mjs"
elif [ -f "$HOME/.gemini/antigravity/skills/tk_code_studio/scripts/live.mjs" ]; then
    SCRIPT_PATH="$HOME/.gemini/antigravity/skills/tk_code_studio/scripts/live.mjs"
elif [ -f "$HOME/.claude/skills/tk_code_studio/scripts/live.mjs" ]; then
    SCRIPT_PATH="$HOME/.claude/skills/tk_code_studio/scripts/live.mjs"
elif [ -f "$HOME/.cursor/skills/tk_code_studio/scripts/live.mjs" ]; then
    SCRIPT_PATH="$HOME/.cursor/skills/tk_code_studio/scripts/live.mjs"
fi

if [ -z "$SCRIPT_PATH" ]; then
    echo "[ERROR] Could not find live.mjs script."
    echo "Please ensure TK Code Studio is installed in your project or global skills directory."
    exit 1
fi

echo "[*] Starting TK Code Studio..."
exec node "$SCRIPT_PATH" start "$@"

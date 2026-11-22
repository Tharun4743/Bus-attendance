---
name: tk_code_studio
description: Visual live editing studio for local web applications, wired directly to your source code and AI coding agent. When triggered, automatically generates run_tk_studio.bat, auto-configures the project, boots the dev server and proxy, opens the browser, and handles live code changes with ZERO manual steps. Trigger on "tk code studio", "tk_code_studio", "live edit", "visual editor", "edit on the page", "/tk_code_studio", "/tk-code-studio", or when visual live editing is requested.
---

# TK Code Studio

Visual in-browser live editing studio. Wraps any running dev server with a lightweight local proxy and injects an isolated Shadow-DOM visual overlay.
- Plain text edits are auto-matched and written straight into `.tsx`, `.jsx`, `.vue`, `.svelte`, `.astro`, `.html`, or `.json` source files.
- Structural edits (duplications, deletions, state toggles) are queued into `.live/pending.json` for the agent to resolve idiomatically.

---

## ⚡ Zero-Manual Execution Protocol (MANDATORY FOR AGENT)

When this skill is invoked by the user or triggered by `/tk_code_studio`, **DO NOT prompt the user with manual setup commands**. Execute the full automated pipeline immediately:

### Step 1: Auto-Config & Generate `run_tk_studio.bat`
Check if `run_tk_studio.bat` exists in the current project root. If not, run:
```bash
node <path-to-tk_code_studio>/scripts/live.mjs init
```
This automatically:
1. Copies the skill scripts into `.agent/skills/tk_code_studio/`.
2. Generates the self-contained Windows runner **`run_tk_studio.bat`** in the project root.
3. Injects `"live": "node .agent/skills/tk_code_studio/scripts/live.mjs start"` into `package.json`.
4. Adds `.live/` to `.gitignore`.

### Step 2: Auto-Detect or Auto-Start Dev Server
Inspect if a dev server is already listening on common ports (3000, 5173, etc.).
- If not running, start the dev server automatically in the background using `run_command` (e.g. `npm run dev`).

### Step 3: Auto-Start TK Code Studio Proxy
Start the proxy in the background:
```bash
node <path-to-tk_code_studio>/scripts/live.mjs start
```
*(or invoke `run_tk_studio.bat`)*.
The runner automatically opens **`http://localhost:4743`** in the user's default browser.

### Step 4: Autonomous Live Queue Listener Loop
Run the listener in the background:
```bash
node <path-to-tk_code_studio>/scripts/live.mjs wait
```
When the user clicks **Save to code** in the browser, process queued items immediately:

| Queued Op | Agent Action |
|---|---|
| `text` (ambiguous / notfound) | Inspect listed candidate files. Match context and update the correct file/CMS/i18n entry. |
| `duplicate` | If component is mapped from an array/JSON, append a clean new entry. If static JSX/HTML, duplicate markup preserving unique keys/ids. |
| `delete` | Remove the corresponding array item or markup, and clean up unused imports. |
| `attr` `disabled` | Toggle `disabled` attribute or the corresponding component prop/state. |

After applying changes:
1. Clear completed items: `node <path-to-tk_code_studio>/scripts/live.mjs done <id>`
2. Announce the update in one line with file links: `Updated <filename>#L<line>`.
3. Re-run `node <path-to-tk_code_studio>/scripts/live.mjs wait` to keep the live session active until the user stops.

---

## 🖱️ In-Browser Visual Overlay Features

- **Edit Mode ON / OFF Toggle (`Alt+E`)**: Glowing green switch in the floating dock or keyboard shortcut (`Alt+E`) to toggle between live editing mode and normal interactive browsing without click interference.
- **Hover**: Highlights element boundaries and displays tag name.
- **Click**: Selects element and opens floating action toolbar.
- **Double-Click**: Inline text editing (`Enter` commits visual draft, `Esc` cancels).
- **Parent ↑ / Child ↓**: Effortless DOM tree navigation to select parent cards or child elements.
- **Duplicate**: Clones cards visually in real-time and queues code creation.
- **Delete**: Removes element visually and queues code removal.
- **Enable / Disable**: Toggles button disabled states.
- **Save to code (`Ctrl+S` / `Cmd+S`)**: Commits changes: writes text to files and flushes structural queue.

---

## 🛡️ Security & Integrity

- Proxy binds exclusively to `127.0.0.1` and authenticates save calls with a cryptographically secure token (`x-live-token`).
- All changes are applied to local source files only.
- Stop the session when the user indicates they are finished.

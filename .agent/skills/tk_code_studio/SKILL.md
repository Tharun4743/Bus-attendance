---
name: tk_code_studio
description: Visual live editing studio for local web applications, wired directly to your source code and AI coding agent. When triggered, auto-configures the project, boots the dev server and proxy, opens the browser, and handles live code changes with ZERO manual steps. Trigger on "tk code studio", "tk_code_studio", "live edit", "visual editor", "edit on the page", "/tk_code_studio", "/tk-code-studio", or when visual live editing is requested.
---

# TK Code Studio

Visual in-browser live editing studio and agent skill for local web applications. Wraps any running dev server with a lightweight local proxy and injects an isolated Shadow-DOM visual overlay.
- Plain text edits are auto-matched and written straight into `.tsx`, `.jsx`, `.vue`, `.svelte`, `.astro`, `.html`, or `.json` source files.
- Structural edits (duplications, deletions, state toggles) are queued into `.live/pending.json` for the agent to resolve idiomatically.

---

## ⚡ Zero-Manual Execution Protocol (MANDATORY FOR AGENT)

When this skill is invoked by the user or triggered by `/tk_code_studio`, **DO NOT prompt the user with manual setup commands**. Execute the full automated pipeline immediately:

### Step 1: Resolve Skill & Auto-Init Target Project
Locate `scripts/live.mjs`:
- Check if `.agent/skills/tk_code_studio/scripts/live.mjs` or `scripts/live.mjs` exists in the current project root.
- If not, use the path of this installed skill (`<this-skill-dir>/scripts/live.mjs`).

If the target project is missing runner scripts or `.agent/skills/tk_code_studio/`, run:
```bash
node <path-to-skill>/scripts/live.mjs init
```
This automatically:
1. Installs the lightweight scripts into `.agent/skills/tk_code_studio/` (excluding VCS and media).
2. Generates self-contained project runners:
   - **`run_tk_studio.bat`** (Windows)
   - **`run_tk_studio.sh`** (macOS / Linux)
3. Injects `"live": "node .agent/skills/tk_code_studio/scripts/live.mjs start"` into `package.json`.
4. Adds `.live/` to `.gitignore`.

### Step 2: Auto-Detect or Auto-Start Dev Server
Inspect if a dev server is already listening on common ports (3000, 5173, etc.).
- If not running, start the dev server automatically in the background using `run_command` (e.g. `npm run dev`), or allow TK Code Studio to launch its built-in zero-dependency static server.

### Step 3: Auto-Start TK Code Studio Proxy
Start the proxy in the background:
```bash
node <path-to-skill>/scripts/live.mjs start
```
*(or run `run_tk_studio.bat` on Windows / `./run_tk_studio.sh` on macOS/Linux)*.
The runner automatically opens **`http://localhost:4321`** (or active port) in the user's default browser.

### Step 4: Autonomous Live Queue Listener Loop
Run the listener in the background:
```bash
node <path-to-skill>/scripts/live.mjs wait
```
When the user clicks **Save to code** in the browser, process queued items immediately:

| Queued Op | Agent Action |
|---|---|
| `text` (ambiguous / notfound) | Inspect listed candidate files. Match context and update the correct file/CMS/i18n entry. |
| `duplicate` | If component is mapped from an array/JSON, append a clean new entry. If static JSX/HTML, duplicate markup preserving unique keys/ids. |
| `delete` | Remove the corresponding array item or markup, and clean up unused imports. |
| `resize` | Apply updated width, height, or padding to the box, input, or button (via inline style or Tailwind utility classes). |
| `asset_swap` | Update the `src` attribute or background image URL of the target component/markup to the uploaded asset path. |
| `move` | Reorder elements within the template markup or re-sort mapped array elements in code. |
| `style` | Apply updated style property (e.g. `color`, `backgroundColor`, `fontSize`) to the target component. |
| `attr` `disabled` | Toggle `disabled` attribute or the corresponding component prop/state. |

After applying changes:
1. Clear completed items: `node <path-to-skill>/scripts/live.mjs done <id>`
2. Announce the update in one line with file links: `Updated <filename>#L<line>`.
3. Re-run `node <path-to-skill>/scripts/live.mjs wait` to keep the live session active until the user stops.

---

## 🖱️ In-Browser Visual Overlay Features

- **⚡ TK Code Studio Branding & Active Element Pill**: Sleek brand badge in the dock with a live `<tag.class> W×H` dimensions pill displaying the active element's tag, primary class, and bounding width/height in real time.
- **Edit Mode ON / OFF Toggle (`Alt+E`)**: Glowing green switch in the floating dock or keyboard shortcut (`Alt+E`) to toggle between live editing mode and normal interactive browsing without click interference.
- **Hover**: Highlights element boundaries and displays tag name.
- **Click**: Selects element, displays live dimensions in dock, and opens floating action toolbar.
- **Double-Click**: Inline text editing (`Enter` commits visual draft, `Esc` cancels).
- **DOM Hierarchy Navigation (`Alt+P` / `Alt+C`)**: Parent ↑ and Child ↓ shortcuts to navigate containers, grids, or nested wrappers.
- **Duplicate (`Ctrl+D` / `Cmd+D`)**: Clones cards visually in real-time and queues code creation.
- **Visual Drag Handles (Drag to Resize)**: Drag right, bottom, or corner handles on any box, card, input field, or button with live pixel dimensions tooltip (`240px × 48px`).
- **Size Dialog & Presets (`Size 📐` / `Alt+R`)**: Quick dimension controls for boxes (`100%`, `50%`, `380px`, `auto`), input fields, and buttons (`Sm`, `Md`, `Lg`, `Full Width`, or custom).
- **Move Elements (`Alt+↑` / `Alt+↓`)**: Reorder buttons, cards, boxes, and form fields up or down within their parent container in real-time.
- **Dynamic Color Wheel (`Color 🎨` / `Alt+K`, `BG 🖌️` / `Alt+B`)**: Native HTML5 color spectrum picker with eyedropper support and instant real-time live preview for text and background colors.
- **Font & Icon Sizing (`Font 🔤`)**: Interactive `A-` / `A+` buttons and preset typography scales for text and icons.
- **Drag & Drop Image Asset Swapping (`Replace 📷`)**: Drag any image file from desktop onto an image to auto-upload to project assets and swap `src` in real-time.
- **Delete (`Delete` / `Backspace`)**: Removes element visually and queues code removal.
- **Enable / Disable**: Toggles button disabled states.
- **Undo (`Ctrl+Z` / `Cmd+Z`)**: Instantly rolls back the last in-memory visual edit.
- **Save to code (`Ctrl+S` / `Cmd+S`)**: Commits changes: writes text to files and flushes structural queue.
- **Deselect (`Escape`)**: Clears active selection and closes toolbars.

---

## 🛡️ Security & Integrity

- Proxy binds exclusively to `127.0.0.1` and authenticates save calls with a cryptographically secure token (`x-live-token`).
- All changes are applied to local source files only.
- Stop the session when the user indicates they are finished.

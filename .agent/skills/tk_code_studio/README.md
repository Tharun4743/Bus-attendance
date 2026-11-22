# ⚡ TK Code Studio

**Visual, in-browser live editing studio for local web applications — wired directly to your source code and AI coding agent.**

---

## 💡 What is TK Code Studio?

**TK Code Studio** eliminates the friction between viewing your web application in the browser and hunting down lines in your code editor. It wraps your dev server with a local reverse proxy, injecting a lightweight, isolated Shadow-DOM overlay directly into your page.

- **Edit Visually:** Double-click any headline, button, or paragraph to edit inline. Reorder, duplicate, or delete cards and components with real-time visual feedback.
- **Direct-to-Source Sync:** Text changes are located across your codebase and written straight into `.tsx`, `.jsx`, `.vue`, `.svelte`, `.astro`, `.html`, or `.json` source files.
- **Smart Disambiguation:** When identical text occurs across multiple components (e.g., repeated pricing tiers or team cards), **TK Code Studio** scores sibling DOM context to update the exact target line.
- **AI Agent Automation:** Complex structural mutations (adding items to mapped arrays, state toggling, element deletion) are queued into `.live/pending.json`. AI coding agents (Antigravity, Claude Code, Cursor) ingest queued tasks, write idiomatic code, and clear them autonomously.
- **Zero Config Fallback:** Automatically detects existing dev servers on common ports (3000, 5173, etc.), auto-boots `npm run dev` if present, or serves static projects instantly via its built-in zero-dependency server.

```
┌────────────────────────┐         ┌────────────────────────┐         ┌────────────────────────┐
│                        │  4743   │     TK Code Studio     │         │   Your Dev Server      │
│     Browser Window     │◄───────►│     Reverse Proxy      │◄───────►│  (Vite, Next, Astro,   │
│ (Shadow DOM Injected)  │         │  (Node.js / Zero-dep)  │         │   Nuxt, or Built-in)   │
└───────────┬────────────┘         └───────────┬────────────┘         └────────────────────────┘
            │                                  │
            │ Direct Text Edits                │ Structural Operations
            ▼                                  ▼
┌────────────────────────┐         ┌────────────────────────┐
│   Local Source Files   │         │   .live/pending.json   │
│  (.tsx, .html, .vue)   │         └───────────┬────────────┘
└────────────────────────┘                     │
                                               ▼
                                   ┌────────────────────────┐
                                   │    AI Coding Agent     │
                                   │ (live.mjs wait & done) │
                                   └────────────────────────┘
```

---

## 🚀 Installation & Setup

### ⚡ 1-Prompt Global Setup (Fastest — Paste in your AI Chat)

You can configure **TK Code Studio** globally in seconds. Just copy and paste this prompt into your AI coding agent (Antigravity, Claude Code, Cursor, Windsurf):

```text
Import and configure the TK Code Studio skill from https://github.com/Tharun4743/TK_CodeStudio.git into my global skills directory (~/.gemini/config/skills/tk_code_studio). Once configured, whenever I ask you to visually edit or launch any opened project, automatically generate run_tk_studio.bat in that project root, auto-start the dev server, launch the proxy on port 4743, and open my browser for visual live editing.
```

#### What happens automatically:
1. Your AI agent clones/updates `TK_CodeStudio` into your global skills directory.
2. In **any opened project or folder**, your agent automatically generates **`run_tk_studio.bat`**.
3. Auto-detects your dev server (or starts the built-in static server) and opens **`http://localhost:4743`** with zero manual setup.

---

### 💻 Manual Global Installation (Terminal)

If you prefer to install via terminal instead:

#### Windows:
```cmd
git clone https://github.com/Tharun4743/TK_CodeStudio.git "%USERPROFILE%\.gemini\config\skills\tk_code_studio"
```

#### macOS / Linux:
```bash
git clone https://github.com/Tharun4743/TK_CodeStudio.git ~/.gemini/config/skills/tk_code_studio
```

---

### 📁 Manual Project Integration (Without AI)

To manually initialize TK Code Studio inside a specific project folder:

```bash
node <path_to_tk_code_studio>/scripts/live.mjs init
```

This generates **`run_tk_studio.bat`** in that project root and configures `npm run live`. Launch anytime with:
```bash
run_tk_studio.bat
```

---

## 🖱️ Visual Overlay Controls & Shortcuts

The visual editing overlay lives in an isolated Shadow DOM (`#__live-host`) with zero CSS leakage into your application.

| Action | Control / Shortcut | Description |
| :--- | :--- | :--- |
| **Hover** | Mouse move | Highlights element bounding box and displays HTML tag name. |
| **Select** | Click element | Activates element and opens the floating context toolbar. |
| **Inline Edit** | Double-Click | Turns text directly into an editable field. Press <kbd>Enter</kbd> to commit visual draft, <kbd>Esc</kbd> to cancel. |
| **Parent ↑** | <kbd>Parent</kbd> button | Climbs DOM tree to select parent cards, containers, or grid wrappers. |
| **Child ↓** | <kbd>Child</kbd> button | Descends DOM tree into child elements. |
| **Duplicate** | <kbd>Duplicate</kbd> | Visually clones element in real-time and queues code creation in `.live/pending.json`. |
| **Delete** | <kbd>Delete</kbd> | Visually hides element and queues clean code removal. |
| **Toggle State** | <kbd>Disable / Enable</kbd> | Toggles button/input `disabled` attribute visually and in queue. |
| **Undo** | <kbd>Undo</kbd> | Rolls back the last in-memory visual edit. |
| **Save to Code** | <kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> | Flushes changes: writes plain text straight to files and triggers queue listener. |

---

## 🤖 AI Agent Autonomous Workflow

When you click **Save to code** (<kbd>Ctrl+S</kbd>), operations are cleanly partitioned:

1. **Deterministic Text Changes:** Direct matches are written to source files immediately.
2. **Structural & Ambiguous Operations:** Written to `.live/pending.json`.

### How your AI Coding Agent listens and resolves tasks:

The coding agent executes:
```bash
node scripts/live.mjs wait
```

This waits until the browser emits saved items:
```text
[7c29e1] DUPLICATE  page: /pricing
  element: <div class="plan-card"> "Enterprise Plan - $99/mo"
  selector: div.plans-grid > div.plan-card:nth-of-type(3)
  sibling texts: ["Starter Plan", "$19/mo", "Pro Plan", "$49/mo"]
```

The agent then:
1. Locates the component template or backing data array (e.g. `plans.map(...)`).
2. Duplicates or removes the item adhering to strict code conventions.
3. Clears the completed queue item:
   ```bash
   node scripts/live.mjs done 7c29e1
   ```
4. Resumes waiting for your next visual edit.

---

## 💻 CLI Command Reference

`scripts/live.mjs` is completely dependency-free (requires Node 18+):

```bash
node scripts/live.mjs <command> [options]
```

| Command | Arguments / Flags | Description |
| :--- | :--- | :--- |
| **`start`** | `--port <num>` (default: `4743`)<br>`--target <url>` | Starts the proxy and opens the browser. Auto-detects dev server or starts static server. |
| **`init`** | — | Scaffolds `.agent/skills/tk_code_studio`, configures `package.json`, and creates `run_tk_studio.bat`. |
| **`wait`** | `--timeout <sec>` (default: `600`) | Blocks execution until structural edits are saved from the browser, then prints them. |
| **`pending`** | — | Prints all staged structural changes in human-readable format without blocking. |
| **`done`** | `[id ...]` | Clears resolved items by ID, or flushes entire queue if no ID is passed. |

### Advanced CLI Examples:

```bash
# Proxy a custom backend port
node scripts/live.mjs start --port 5000 --target http://localhost:8080

# Inspect currently queued changes
node scripts/live.mjs pending

# Clear specific queue item after manual code edit
node scripts/live.mjs done 7c29e1
```

---

## 📊 Comparison With Traditional Tooling

| Capability | Chrome DevTools | Figma / Builder | React DevTools | ⚡ TK Code Studio |
| :--- | :---: | :---: | :---: | :---: |
| **Edits persist to source code** | ❌ (Lost on refresh) | ❌ (Separate sync) | ❌ (State only) | ✅ **Instant direct write** |
| **Zero NPM dependencies** | N/A | ❌ (Heavy packages) | N/A | ✅ **Pure Node standard lib** |
| **Zero CSS bleed (Shadow DOM)** | ❌ | ❌ | ❌ | ✅ **Fully isolated** |
| **Multi-framework support** | ✅ | ❌ | ❌ (React only) | ✅ **React, Vue, Svelte, Astro, HTML** |
| **AI Agent Queue Integration** | ❌ | ❌ | ❌ | ✅ **Native `wait` / `done` queue** |
| **Hot Module Replacement (HMR)** | N/A | ❌ | ✅ | ✅ **Transparent WS passthrough** |

---

## 🛡️ Security & Privacy

- **Localhost Binding:** Reverse proxy binds strictly to `127.0.0.1`. No external network exposure.
- **Cryptographic Token Verification:** All save payloads must present a valid per-session `x-live-token` generated on startup.
- **Zero Cloud Leakage:** All edits are executed entirely on your local filesystem. No telemetry, third-party trackers, or cloud dependencies.

---

## 📄 License & Attribution

- Built and maintained by **Tharun Kumar** ([@Tharun4743](https://github.com/Tharun4743)).
- Released under the **MIT License**. Free for commercial and personal use.

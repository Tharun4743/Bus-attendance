<p align="center">
  <img src="assets/banner.jpg" alt="TK Code Studio — One Skill. Every IDE." width="100%">
</p>

# ⚡ TK Code Studio

**Visual, in-browser live editing studio for local web applications — wired directly to your source code and AI coding agent.**

---

## 🎬 Live Demo

<p align="center">
  <video src="assets/demo.mp4" width="100%" controls autoplay loop muted playsinline>
    <iframe src="assets/demo.mp4" width="100%" height="450" frameborder="0" allowfullscreen></iframe>
  </video>
</p>

> 💡 **Watch TK Code Studio in Action:** Edit text directly on the page, reorder cards visually, and press <kbd>Ctrl + S</kbd> to persist changes instantly to your source code.

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
│                        │  4321   │     TK Code Studio     │         │   Your Dev Server      │
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
Import and configure the TK Code Studio skill from https://github.com/Tharun4743/TK_CodeStudio.git into my global skills directory (~/.gemini/config/skills/tk_code_studio). Once configured, whenever I ask you to visually edit or launch any opened project, automatically generate the runner in that project root, auto-start the dev server, launch the proxy, and open my browser for visual live editing.
```

#### What happens automatically:
1. Your AI agent clones/updates `TK_CodeStudio` into your global skills directory.
2. In **any opened project or folder**, your agent automatically generates **`run_tk_studio.bat`** (Windows) and **`run_tk_studio.sh`** (Unix).
3. Auto-detects your dev server (or starts the built-in static server) and opens **`http://localhost:4321`** with zero manual setup.

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

#### For Claude Code or Cursor:
```bash
# Claude Code global skills
git clone https://github.com/Tharun4743/TK_CodeStudio.git ~/.claude/skills/tk_code_studio

# Cursor / Project-local skills
git clone https://github.com/Tharun4743/TK_CodeStudio.git .agent/skills/tk_code_studio
```

---

### 📁 Manual Project Integration (Without AI)

To manually initialize TK Code Studio inside a specific project folder:

```bash
node <path_to_tk_code_studio>/scripts/live.mjs init
```

This generates **`run_tk_studio.bat`** (Windows) and **`run_tk_studio.sh`** (macOS/Linux) in that project root and configures `npm run live`. Launch anytime with:
```bash
# Windows
run_tk_studio.bat

# macOS / Linux
./run_tk_studio.sh

# Or via npm
npm run live
```

---

## 🖱️ Visual Overlay Controls & Shortcuts

The visual editing overlay lives in an isolated Shadow DOM (`#__live-host`) with zero CSS leakage into your application.

| Action | Control / Shortcut | Description |
| :--- | :--- | :--- |
| **Edit Mode ON / OFF** | <kbd>Alt</kbd> + <kbd>E</kbd> | Toggles between live visual editing and native interactive browsing. When OFF, the toolbar collapses to a minimal pill and clicks pass through natively. |
| **Hover** | Mouse move | Highlights element bounding box and displays HTML tag name. |
| **Select** | Click element | Activates element, displays live dimensions in dock, and opens context toolbar. |
| **Inline Edit** | Double-Click | Turns text directly into an editable field. Press <kbd>Enter</kbd> to commit visual draft, <kbd>Esc</kbd> to cancel. |
| **Dynamic Text Color** | <kbd>Color 🎨</kbd> / <kbd>Alt</kbd> + <kbd>K</kbd> | Opens interactive dynamic HTML5 color wheel with real-time DOM spectrum preview. |
| **Dynamic Background** | <kbd>BG 🖌️</kbd> / <kbd>Alt</kbd> + <kbd>B</kbd> | Opens interactive dynamic background color spectrum picker. |
| **Font & Icon Size** | <kbd>Font 🔤</kbd> button | <kbd>A-</kbd> / <kbd>A+</kbd> fine adjustments or preset typography scales (12px to 40px) for text and icons. |
| **Drag Resize** | Drag Handles on Box | Drag right, bottom, or corner handles on any box, card, input field, or button with live pixel tooltip. |
| **Size & Presets** | <kbd>Size 📐</kbd> / <kbd>Alt</kbd> + <kbd>R</kbd> | Set instant presets for buttons/inputs (`Sm`, `Md`, `Lg`, `100%`) or box containers (`100%`, `50%`, `380px`, `auto`). |
| **Move Elements** | <kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>Alt</kbd> + <kbd>↓</kbd> | Reorder buttons, inputs, cards, or boxes before or after siblings in real-time. |
| **Traverse DOM** | <kbd>Alt</kbd> + <kbd>P</kbd> / <kbd>Alt</kbd> + <kbd>C</kbd> | Effortless DOM hierarchy navigation (<kbd>Alt+P</kbd> for Parent, <kbd>Alt+C</kbd> for Child). |
| **Duplicate** | <kbd>Ctrl</kbd> + <kbd>D</kbd> / <kbd>Cmd</kbd> + <kbd>D</kbd> | Visually clones element in real-time and queues code creation in `.live/pending.json`. |
| **Delete** | <kbd>Delete</kbd> / <kbd>Backspace</kbd> | Visually hides element and queues clean code removal. |
| **Asset Swapping** | Drag & Drop / <kbd>Replace 📷</kbd> | Drag any image file from desktop onto an image to auto-upload to project assets and swap `src`. |
| **Toggle State** | <kbd>Disable / Enable</kbd> | Toggles button/input `disabled` attribute visually and in queue. |
| **Undo** | <kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Cmd</kbd> + <kbd>Z</kbd> | Rolls back the last in-memory visual edit. |
| **Save to Code** | <kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> | Flushes changes: writes plain text straight to files and triggers queue listener. |
| **Deselect** | <kbd>Escape</kbd> | Clears active selection and closes toolbars. |

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
| **`start`** | `--port <num>` (default: `4321`)<br>`--target <url>` | Starts the proxy and opens the browser. Auto-detects dev server or starts static server. |
| **`init`** | — | Scaffolds `.agent/skills/tk_code_studio`, configures `package.json`, and creates `run_tk_studio.bat` and `run_tk_studio.sh`. |
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

## 👨‍💻 Author & Engineering Credentials

<table border="0" itemscope itemtype="https://schema.org/Person">
  <tr>
    <td width="130" align="center" valign="middle">
      <img src="https://github.com/Tharun4743.png" width="105" style="border-radius: 6px;" alt="Tharunkumar K — Full Stack Developer & AI Systems Engineer at V.S.B. Engineering College" title="Tharunkumar K — V.S.B. Engineering College (VSBEC)" itemprop="image" />
    </td>
    <td>
      <h3 itemprop="name">Tharunkumar K</h3>
      <p>
        <b itemprop="jobTitle">Full Stack Developer & AI Systems Engineer</b> | <b>V.S.B. Engineering College (VSBEC)</b><br/>
        🎓 <b>B.Tech in Information Technology</b> — <b>V.S.B. Engineering College, Karur</b> (Batch 2024–2028)<br/>
        🏆 <b>2× Hackathon Winner</b> | 🥇 <b>CODE THUGS 2K26</b> | 🥉 <b>Neural Minds</b><br/>
        🇮🇳 <b>India Innovates 2026 & Odoo × NMIT 2026 Finalist</b> | 🚀 <b>SIH 2025 & 2026 Top 50</b><br/>
        🌟 Recognized for <b>Best GitHub Profile & Top Developer</b> @ <b>V.S.B. ENGINEERING COLLEGE</b>
      </p>
      <p>
        🚀 <b>Top Flagship Engineering Projects:</b><br/>
        • 🏛️ <b>TaskManager (VSBEC IT Vault)</b> — Institutional Task Governance & LeetCode/GitHub Sync &nbsp;<a href="https://github.com/Tharun4743/Taskmanager"><img src="https://img.shields.io/badge/Code-181717?style=flat-square&logo=github&logoColor=white" alt="Code" /></a>&nbsp;<a href="https://it-taskmanager.vercel.app/"><img src="https://img.shields.io/badge/Live_Demo-10B981?style=flat-square&logo=vercel&logoColor=white" alt="Live Demo" /></a><br/>
        • 🧠 <b>AURA</b> — Air-Gapped Local Multimodal RAG Engine & Offline AI Assistant &nbsp;<a href="https://github.com/Tharun4743/AURA"><img src="https://img.shields.io/badge/Code-181717?style=flat-square&logo=github&logoColor=white" alt="Code" /></a><br/>
        • 🪖 <b>Smart Helmet IoT</b> — SIH Top 50 Dual-Unit Motorcycle Accident Prevention System &nbsp;<a href="https://github.com/Tharun4743/AGILE-INNOVATORS-smart-helmet-"><img src="https://img.shields.io/badge/Code-181717?style=flat-square&logo=github&logoColor=white" alt="Code" /></a><br/>
        • ⚡ <b>GOAT-CE</b> — Isolated Distributed Multi-Language Code Execution Sandbox &nbsp;<a href="https://github.com/Tharun4743/GOAT-CE"><img src="https://img.shields.io/badge/Code-181717?style=flat-square&logo=github&logoColor=white" alt="Code" /></a>
      </p>
      <p>
        <a href="https://tharunkumark4743.netlify.app/"><img src="https://img.shields.io/badge/Portfolio-0284c7?style=flat-square&logo=googlechrome&logoColor=white" alt="Portfolio" /></a>&nbsp;
        <a href="https://github.com/Tharun4743"><img src="https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub" /></a>&nbsp;
        <a href="https://www.linkedin.com/in/tharunkumark4743"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white" alt="LinkedIn" /></a>&nbsp;
        <a href="https://leetcode.com/u/Tharunkumar__K/"><img src="https://img.shields.io/badge/LeetCode-FFA116?style=flat-square&logo=leetcode&logoColor=white" alt="LeetCode" /></a>&nbsp;
        <a href="mailto:tharunkumark42007@gmail.com"><img src="https://img.shields.io/badge/Email-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Email" /></a>
      </p>
    </td>
  </tr>
</table>

---

## 📄 License & Attribution

- Built and maintained by **Tharun Kumar** ([@Tharun4743](https://github.com/Tharun4743)).
- Released under the **MIT License**. Free for commercial and personal use.

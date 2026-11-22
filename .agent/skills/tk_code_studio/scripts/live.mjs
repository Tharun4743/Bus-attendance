#!/usr/bin/env node
// TK Code Studio: local proxy + visual overlay that writes edits back to source.
// Zero dependencies. Node 18+.
//
// Commands:
//   init                      install into .agent/skills/tk_code_studio, create run_tk_studio.bat
//   start [--target URL] [--port 4321]
//   wait [--timeout 600]      block until the browser queues structural changes, print them
//   pending                   print queued changes
//   done [id ...]             clear queue items (all if no ids)

import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { exec, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();

// Prioritize local node_modules/.bin in PATH for all spawned commands
process.env.PATH = path.join(ROOT, 'node_modules', '.bin') + path.delimiter + process.env.PATH;

process.on('uncaughtException', err => {
  console.warn('[TK Studio Warning]', err.message);
});
process.on('unhandledRejection', err => {
  console.warn('[TK Studio Warning]', err?.message || err);
});
const LIVE_DIR = path.join(ROOT, '.live');
const QUEUE = path.join(LIVE_DIR, 'pending.json');
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.svelte-kit', '.live', '.agent', '.vercel', '.turbo', 'coverage', 'out']);
const EXT = new Set(['.html', '.htm', '.jsx', '.tsx', '.js', '.ts', '.mjs', '.vue', '.svelte', '.astro', '.mdx', '.md', '.json']);
const SKIP_FILES = new Set(['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'tsconfig.json']);

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i > -1 ? argv[i + 1] : d; };

function generateRunners() {
  const batPath = path.join(ROOT, 'run_tk_studio.bat');
  const shPath = path.join(ROOT, 'run_tk_studio.sh');

  const batContent = `@echo off
setlocal
title TK Code Studio - Auto Launcher
color 0B

cd /d "%~dp0"

echo ===================================================
echo           TK CODE STUDIO - AUTO LAUNCHER
echo ===================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not found in PATH. Please install Node.js 18+.
    pause
    exit /b 1
)

set "PATH=%~dp0node_modules\\.bin;%PATH%"

set "SCRIPT_PATH="
if exist ".agent\\skills\\tk_code_studio\\scripts\\live.mjs" (
    set "SCRIPT_PATH=.agent\\skills\\tk_code_studio\\scripts\\live.mjs"
) else if exist "scripts\\live.mjs" (
    set "SCRIPT_PATH=scripts\\live.mjs"
) else if exist "%USERPROFILE%\\.gemini\\config\\skills\\tk_code_studio\\scripts\\live.mjs" (
    set "SCRIPT_PATH=%USERPROFILE%\\.gemini\\config\\skills\\tk_code_studio\\scripts\\live.mjs"
) else if exist "%USERPROFILE%\\.gemini\\antigravity\\skills\\tk_code_studio\\scripts\\live.mjs" (
    set "SCRIPT_PATH=%USERPROFILE%\\.gemini\\antigravity\\skills\\tk_code_studio\\scripts\\live.mjs"
) else if exist "%USERPROFILE%\\.claude\\skills\\tk_code_studio\\scripts\\live.mjs" (
    set "SCRIPT_PATH=%USERPROFILE%\\.claude\\skills\\tk_code_studio\\scripts\\live.mjs"
) else if exist "%USERPROFILE%\\.cursor\\skills\\tk_code_studio\\scripts\\live.mjs" (
    set "SCRIPT_PATH=%USERPROFILE%\\.cursor\\skills\\tk_code_studio\\scripts\\live.mjs"
)

if "%SCRIPT_PATH%"=="" (
    echo [ERROR] Could not find live.mjs script.
    echo Please ensure TK Code Studio is installed in your project or global skills directory.
    pause
    exit /b 1
)

echo [*] Starting TK Code Studio...
node "%SCRIPT_PATH%" start %*

if errorlevel 1 (
    echo.
    echo [!] TK Code Studio stopped.
    pause
)
`.replace(/\r?\n/g, '\r\n');

  const shContent = `#!/usr/bin/env bash
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
`.replace(/\r\n/g, '\n');

  try {
    fs.writeFileSync(batPath, batContent);
    console.log(`  ✓ Auto-generated Windows runner: ${path.relative(ROOT, batPath)}`);
  } catch (err) {
    console.warn(`  ! could not create bat file: ${err.message}`);
  }

  try {
    fs.writeFileSync(shPath, shContent);
    try { fs.chmodSync(shPath, 0o755); } catch {}
    console.log(`  ✓ Auto-generated Unix runner: ${path.relative(ROOT, shPath)}`);
  } catch (err) {
    console.warn(`  ! could not create sh file: ${err.message}`);
  }
}

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      exec(`start "" "${url}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${url}"`);
    } else {
      exec(`xdg-open "${url}"`);
    }
  } catch {}
}

// ---------- queue ----------
function readQueue() {
  try { return JSON.parse(fs.readFileSync(QUEUE, 'utf8')); } catch { return { ready: false, items: [] }; }
}
function writeQueue(q) {
  fs.mkdirSync(LIVE_DIR, { recursive: true });
  fs.writeFileSync(QUEUE, JSON.stringify(q, null, 2));
}

// ---------- source search / write ----------
function* walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.') { if (SKIP.has(e.name)) continue; }
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (EXT.has(path.extname(e.name)) && !SKIP_FILES.has(e.name)) {
      try { if (fs.statSync(p).size < 500_000) yield p; } catch {}
    }
  }
}

// Build a regex that matches the visible text as it may be written in source:
// entities (&apos; &amp; &quot;), curly vs straight quotes, JSX line breaks.
function textRegex(text) {
  const t = text.trim();
  const words = t.split(/\s+/).map(w => [...w].map(ch => {
    if (ch === "'" || ch === '’' || ch === '‘') return "(?:'|’|‘|&apos;|&#39;|&rsquo;|&lsquo;|\\\\')";
    if (ch === '"' || ch === '“' || ch === '”') return '(?:"|“|”|&quot;|&ldquo;|&rdquo;|\\\\")';
    if (ch === '&') return '(?:&amp;|&)';
    if (ch === '<') return '(?:&lt;|<)';
    if (ch === '>') return '(?:&gt;|>)';
    if (ch === ' ') return '(?:\\u00a0|&nbsp;| )';
    return ch.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&');
  }).join(''));
  const first = /^\w/.test(t) ? '(?<![\\w])' : '';
  const last = /\w$/.test(t) ? '(?![\\w])' : '';
  return new RegExp(first + words.join('\\s+') + last, 'g');
}

let scanned = 0;

// True when no closing bracket / closing tag separates positions a and b,
// i.e. both live inside the same object literal, array item or JSX element.
function sameBlock(src, a, b) {
  const seg = src.slice(Math.min(a, b), Math.max(a, b));
  let depth = 0;
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i];
    if (c === '{' || c === '[' || c === '(') depth++;
    else if (c === '}' || c === ']' || c === ')') { if (--depth < 0) return false; }
    else if (c === '<') {
      if (seg[i + 1] === '/') { if (--depth < 0) return false; }
      else if (/[A-Za-z]/.test(seg[i + 1] || '')) depth++;
    } else if (c === '/' && seg[i + 1] === '>') { if (--depth < 0) return false; }
  }
  return true;
}

// When the same text appears several times, pick the occurrence whose
// neighbourhood in the file contains the most sibling texts from the same card.
function disambiguate(matches, ctx) {
  if (!ctx || !ctx.length) return null;
  // Score = sum over sibling texts of 1/(1+distance/60) to the nearest occurrence in the same file.
  const cache = new Map();
  const positions = (src, c) => {
    const k = c + '\u0000' + src.length;
    if (!cache.has(k)) {
      const re = textRegex(c), out = []; let x;
      while ((x = re.exec(src))) { out.push(x.index); if (!x[0].length) re.lastIndex++; }
      cache.set(k, out);
    }
    return cache.get(k);
  };
  const scored = matches.map(m => {
    let s = 0;
    for (const c of ctx) {
      if (c.trim().length < 3) continue;
      const ps = positions(m.src, c);
      if (!ps.length) continue;
      let best = 0;
      for (const p of ps) {
        const d = Math.abs(p - m.index);
        if (d >= 300) continue;
        best = Math.max(best, (1 / (1 + d / 60)) * (sameBlock(m.src, p, m.index) ? 1 : 0.15));
      }
      s += best;
    }
    return { m, s };
  }).sort((a, b) => b.s - a.s);
  if (scored[0].s > 0.05 && scored[0].s > (scored[1] ? scored[1].s * 1.2 : 0)) return scored[0].m;
  return null;
}

function findMatches(oldText) {
  const re0 = textRegex(oldText);
  const out = [];
  scanned = 0;
  for (const file of walk(ROOT)) {
    scanned++;
    const src = fs.readFileSync(file, 'utf8');
    const re = new RegExp(re0.source, 'g');
    let m;
    while ((m = re.exec(src))) {
      out.push({ file, index: m.index, length: m[0].length, line: src.slice(0, m.index).split('\n').length, src });
      if (m[0].length === 0) re.lastIndex++;
    }
  }
  return out;
}

function escapeFor(file, before, text) {
  const ext = path.extname(file);
  if (before === '"' || before === "'" || before === '`') {
    let t = text.replace(/\\/g, '\\\\').replace(new RegExp(before, 'g'), '\\' + before);
    if (before === '`') t = t.replace(/\$\{/g, '\\${');
    return t.replace(/\n/g, '\\n');
  }
  if (['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.mdx'].includes(ext)) {
    let t = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (['.jsx', '.tsx', '.svelte', '.astro', '.mdx'].includes(ext)) t = t.replace(/\{/g, "{'{'}").replace(/\}/g, "{'}'}");
    return t;
  }
  return text;
}

function applyText(oldText, newText, ctx) {
  let matches = findMatches(oldText);
  if (matches.length === 0) return { status: 'notfound' };
  if (matches.length > 1) {
    const pick = disambiguate(matches, ctx);
    if (!pick) return { status: 'ambiguous', candidates: matches.slice(0, 8).map(m => `${path.relative(ROOT, m.file)}:${m.line}`) };
    matches = [pick];
  }
  const m = matches[0];
  const before = m.src[m.index - 1];
  const rep = escapeFor(m.file, before, newText);
  fs.writeFileSync(m.file, m.src.slice(0, m.index) + rep + m.src.slice(m.index + m.length));
  return { status: 'applied', file: path.relative(ROOT, m.file), line: m.line };
}

// ---------- server ----------
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > 5e6) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

async function start() {
  const port = Number(flag('port', 4321));
  const target = flag('target') || await detectTarget();
  if (!target) { console.error('No dev server found. Start it first, or pass --target http://localhost:PORT'); process.exit(1); }
  const T = new URL(target);
  const targetHost = T.hostname === 'localhost' ? '127.0.0.1' : T.hostname;
  if (!fs.existsSync(path.join(ROOT, 'package.json'))) console.warn(`  ! no package.json in ${ROOT} — run this from your project root, or edits will not be found.`);
  const token = crypto.randomBytes(16).toString('hex');
  const clientJs = fs.readFileSync(path.join(__dir, 'client.js'), 'utf8');

  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/__live/')) {
      try {
        if (req.url === '/__live/client.js') {
          res.writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' });
          return res.end(clientJs);
        }
        if (req.url === '/__live/save' && req.method === 'POST') {
          if (req.headers['x-live-token'] !== token) return json(res, 403, { error: 'bad token' });
          const body = JSON.parse(await readBody(req));
          return json(res, 200, save(body));
        }
        if (req.url === '/__live/upload-asset' && req.method === 'POST') {
          if (req.headers['x-live-token'] !== token) return json(res, 403, { error: 'bad token' });
          const raw = JSON.parse(await readBody(req));
          const name = (raw.name || 'uploaded_image.png').replace(/[^a-zA-Z0-9._-]/g, '_');
          const ext = path.extname(name) || '.png';
          const baseName = path.basename(name, ext);
          const finalName = `${baseName}_${Date.now().toString(36)}${ext}`;

          let destDir = path.join(ROOT, 'public', 'images');
          let publicUrl = `/images/${finalName}`;
          if (!fs.existsSync(path.join(ROOT, 'public'))) {
            if (fs.existsSync(path.join(ROOT, 'src', 'assets'))) {
              destDir = path.join(ROOT, 'src', 'assets');
              publicUrl = `/src/assets/${finalName}`;
            } else if (fs.existsSync(path.join(ROOT, 'assets'))) {
              destDir = path.join(ROOT, 'assets');
              publicUrl = `/assets/${finalName}`;
            } else {
              destDir = path.join(ROOT, 'public');
              publicUrl = `/${finalName}`;
            }
          }
          fs.mkdirSync(destDir, { recursive: true });
          const filePath = path.join(destDir, finalName);
          const buf = Buffer.from((raw.data || '').replace(/^data:[^;]+;base64,/, ''), 'base64');
          fs.writeFileSync(filePath, buf);
          console.log(`  ✓ Asset uploaded: ${path.relative(ROOT, filePath)} -> ${publicUrl}`);
          return json(res, 200, { ok: true, url: publicUrl, file: path.relative(ROOT, filePath) });
        }
        if (req.url.startsWith('/__live/assets/')) {
          const rel = req.url.slice('/__live/assets/'.length);
          const full = path.join(ROOT, 'public', rel);
          if (fs.existsSync(full)) {
            const ext = path.extname(full).toLowerCase();
            const ct = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.svg' ? 'image/svg+xml' : ext === '.webp' ? 'image/webp' : 'application/octet-stream';
            res.writeHead(200, { 'content-type': ct });
            return res.end(fs.readFileSync(full));
          }
        }
        return json(res, 404, { error: 'not found' });
      } catch (e) { return json(res, 500, { error: String(e.message || e) }); }
    }

    const headers = { ...req.headers, host: T.host, 'accept-encoding': 'identity' };
    const p = http.request({ hostname: targetHost, port: T.port || 80, path: req.url, method: req.method, headers }, pr => {
      const ct = pr.headers['content-type'] || '';
      if (ct.includes('text/html')) {
        const chunks = [];
        pr.on('data', c => chunks.push(c));
        pr.on('end', () => {
          let body = Buffer.concat(chunks).toString('utf8');
          const tag = `<script>window.__LIVE_TOKEN=${JSON.stringify(token)}</script><script src="/__live/client.js"></script>`;
          body = /<\/body>/i.test(body) ? body.replace(/<\/body>/i, () => tag + '</body>') : body + tag;
          const h = { ...pr.headers };
          delete h['content-length']; delete h['content-encoding'];
          delete h['content-security-policy']; delete h['content-security-policy-report-only'];
          res.writeHead(pr.statusCode, h);
          res.end(body);
        });
      } else {
        res.writeHead(pr.statusCode, pr.headers);
        pr.pipe(res);
      }
    });
    p.on('error', () => { res.writeHead(502); res.end('TK Code Studio: cannot reach ' + target); });
    req.pipe(p);
  });

  // WebSocket passthrough (HMR)
  server.on('upgrade', (req, socket, head) => {
    const up = net.connect(Number(T.port || 80), targetHost, () => {
      const lines = Object.entries(req.headers).map(([k, v]) => `${k}: ${k === 'host' ? T.host : v}`);
      up.write(`${req.method} ${req.url} HTTP/1.1\r\n${lines.join('\r\n')}\r\n\r\n`);
      if (head && head.length) up.write(head);
      socket.pipe(up).pipe(socket);
    });
    up.on('error', () => socket.destroy());
    socket.on('error', () => up.destroy());
  });

  server.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`\n  [!] Port ${port} is already running TK Code Studio. Opening browser at http://localhost:${port}...`);
      openBrowser(`http://localhost:${port}`);
    } else {
      console.error('  Server error:', err.message);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`\n  ⚡ TK Code Studio ready\n  open  http://localhost:${port}   (proxying ${target})\n  edits write to: ${ROOT}\n`);
    if (!fs.existsSync(path.join(ROOT, 'run_tk_studio.bat')) && !fs.existsSync(path.join(ROOT, 'run-tk-studio.bat'))) {
      generateRunners();
    }
    openBrowser(`http://localhost:${port}`);
  });
}

function save(body) {
  const applied = [], queued = [], failed = [];
  const q = readQueue();
  const stamp = () => crypto.randomBytes(3).toString('hex');

  for (const e of body.edits || []) {
    if (!e.old || !e.old.trim()) continue;
    const r = applyText(e.old, e.new ?? '', e.ctx);
    if (r.status === 'applied') {
      applied.push({ old: e.old, new: e.new, file: r.file, line: r.line });
      console.log(`  ✓ ${r.file}:${r.line}  "${e.old}" -> "${e.new}"`);
    } else {
      q.items.push({ id: stamp(), type: 'text', reason: r.status, candidates: r.candidates || [], old: e.old, new: e.new, page: body.page, selector: e.selector, html: e.html });
      queued.push({ type: 'text', reason: r.status, old: e.old, new: e.new, candidates: r.candidates || [] });
      console.log(`  ⚠ queued (${r.status}) "${e.old}"  scanned ${scanned} files in ${ROOT}`);
    }
  }
  for (const o of body.ops || []) {
    if (o.type === 'asset_swap' && o.oldSrc && o.newSrc) {
      const r = applyText(o.oldSrc, o.newSrc);
      if (r.status === 'applied') {
        applied.push({ old: o.oldSrc, new: o.newSrc, file: r.file, line: r.line });
        console.log(`  ✓ ${r.file}:${r.line}  asset swap "${o.oldSrc}" -> "${o.newSrc}"`);
        continue;
      }
    }
    q.items.push({ id: stamp(), page: body.page, ...o });
    const preview = o.type === 'resize'
      ? `${o.width || ''} × ${o.height || ''}`
      : o.type === 'asset_swap'
      ? `${o.oldSrc || ''} -> ${o.newSrc || ''}`
      : o.type === 'style'
      ? `${o.property}=${o.value}`
      : o.type === 'move'
      ? `move ${o.direction}`
      : (o.text || '');
    queued.push({ type: o.type, tag: o.tag, text: preview });
    console.log(`  ⚠ queued ${o.type} <${o.tag}> "${preview.slice(0, 40)}"`);
  }
  if (queued.length) { q.ready = true; writeQueue(q); }
  return { applied, queued, failed, root: ROOT, scanned };
}

function scanPort(p) {
  return new Promise(r => {
    const q = http.get({ hostname: '127.0.0.1', port: p, path: '/', timeout: 600 }, res => { res.resume(); r(true); });
    q.on('error', () => r(false));
    q.on('timeout', () => { q.destroy(); r(false); });
  });
}

async function scanPorts() {
  const ports = [5173, 3000, 5174, 8080, 3001, 4200, 8000, 5500, 1313];
  const myPort = Number(flag('port', 4321));
  for (const p of ports) {
    if (p === myPort) continue;
    if (await scanPort(p)) return `http://127.0.0.1:${p}`;
  }
  return null;
}

function createStaticDevServer(rootDir) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8'
  };

  const server = http.createServer((req, res) => {
    try {
      let reqPath = decodeURI(req.url.split('?')[0]);
      if (reqPath === '/' || reqPath.endsWith('/')) reqPath += 'index.html';
      let safePath = path.normalize(path.join(rootDir, reqPath));
      if (!safePath.startsWith(rootDir)) {
        res.writeHead(403);
        return res.end('Forbidden');
      }

      if (fs.existsSync(safePath) && fs.statSync(safePath).isDirectory()) {
        safePath = path.join(safePath, 'index.html');
      }

      if (!fs.existsSync(safePath)) {
        const spaIndex = path.join(rootDir, 'index.html');
        if (fs.existsSync(spaIndex)) {
          safePath = spaIndex;
        } else {
          res.writeHead(404, { 'content-type': 'text/plain' });
          return res.end('404 Not Found');
        }
      }

      const ext = path.extname(safePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const content = fs.readFileSync(safePath);
      res.writeHead(200, { 'content-type': contentType });
      res.end(content);
    } catch (err) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Static Server Error: ' + err.message);
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const p = server.address().port;
      console.log(`  📦 Built-in static server started on http://127.0.0.1:${p} (serving ${rootDir})`);
      resolve(`http://127.0.0.1:${p}`);
    });
  });
}

async function trySpawnDevServer() {
  const pjPath = path.join(ROOT, 'package.json');
  if (!fs.existsSync(pjPath)) return null;
  try {
    const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'));
    const scripts = pj.scripts || {};
    let cmd = null;
    if (scripts.dev) cmd = 'dev';
    else if (scripts.start && !scripts.start.includes('live.mjs')) cmd = 'start';
    if (!cmd) return null;

    console.log(`  [*] Starting project dev server via "npm run ${cmd}"...`);
    const isWin = process.platform === 'win32';
    const npmCmd = isWin ? 'npm.cmd' : 'npm';
    const child = spawn(npmCmd, ['run', cmd], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true
    });
    child.on('error', err => {
      console.warn(`  ! Could not auto-start dev server: ${err.message}`);
    });

    const start = Date.now();
    while (Date.now() - start < 10000) {
      await new Promise(r => setTimeout(r, 600));
      const target = await scanPorts();
      if (target) {
        console.log(`  ✓ Dev server detected at ${target}`);
        return target;
      }
    }
  } catch (e) {
    console.warn(`  ! Could not auto-detect dev script: ${e.message}`);
  }
  return null;
}

async function detectTarget() {
  // 1. Scan for existing dev servers
  const found = await scanPorts();
  if (found) return found;

  // 2. Try to auto-start dev server from package.json if available
  const spawned = await trySpawnDevServer();
  if (spawned) return spawned;

  // 3. Fallback to built-in static dev server (serves index.html or root files)
  return await createStaticDevServer(ROOT);
}

// ---------- CLI helpers ----------
function fmt(it) {
  const lines = [`[${it.id}] ${it.type.toUpperCase()}${it.reason ? ' (' + it.reason + ')' : ''}  page: ${it.page || '/'}`];
  if (it.type === 'text') {
    lines.push(`  change text: ${JSON.stringify(it.old)} -> ${JSON.stringify(it.new)}`);
    if (it.candidates?.length) lines.push(`  candidates: ${it.candidates.join(', ')}`);
  } else if (it.type === 'resize') {
    lines.push(`  resize to: width=${it.width || 'auto'}, height=${it.height || 'auto'}${it.padding ? ', padding=' + it.padding : ''} on <${it.tag}> "${(it.text || '').slice(0, 60)}"`);
    if (it.style) lines.push(`  inline style: ${it.style}`);
  } else if (it.type === 'asset_swap') {
    lines.push(`  swap image asset: "${it.oldSrc}" -> "${it.newSrc}" on <${it.tag}>`);
  } else if (it.type === 'move') {
    lines.push(`  move element: ${it.direction} ${it.targetSelector || 'sibling'} on <${it.tag}> "${(it.text || '').slice(0, 60)}"`);
  } else if (it.type === 'style') {
    lines.push(`  style update: ${it.property}=${it.value} on <${it.tag}> "${(it.text || '').slice(0, 60)}"`);
  } else if (it.type === 'attr') {
    lines.push(`  set ${it.name}=${it.value} on <${it.tag}> "${(it.text || '').slice(0, 60)}"`);
  } else {
    lines.push(`  element: <${it.tag}> "${(it.text || '').slice(0, 80)}"`);
  }
  if (it.selector) lines.push(`  selector: ${it.selector}`);
  if (it.html) lines.push(`  html: ${it.html.replace(/\s+/g, ' ').slice(0, 600)}`);
  if (it.parentText) lines.push(`  sibling texts: ${JSON.stringify(it.parentText)}`);
  return lines.join('\n');
}

async function main() {
  if (cmd === 'init') {
    const skillDir = path.resolve(__dir, '..');
    const dest = path.join(ROOT, '.agent', 'skills', 'tk_code_studio');
    if (path.resolve(skillDir) !== path.resolve(dest)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(skillDir, dest, {
        recursive: true,
        filter: (src) => {
          const base = path.basename(src);
          if (['.git', 'node_modules', '.live', 'assets', '.DS_Store', 'Thumbs.db', 'run_tk_studio.bat', 'run_tk_studio.sh', 'index.html'].includes(base)) return false;
          return true;
        }
      });
      console.log('installed skill ->', path.relative(ROOT, dest));
    }
    const pj = path.join(ROOT, 'package.json');
    if (fs.existsSync(pj)) {
      const j = JSON.parse(fs.readFileSync(pj, 'utf8'));
      j.scripts = j.scripts || {};
      j.scripts.live = 'node .agent/skills/tk_code_studio/scripts/live.mjs start';
      fs.writeFileSync(pj, JSON.stringify(j, null, 2) + '\n');
      console.log('added npm script: npm run live');
    }
    const gi = path.join(ROOT, '.gitignore');
    const cur = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
    if (!/^\.live\/?$/m.test(cur)) fs.appendFileSync(gi, (cur.endsWith('\n') || !cur ? '' : '\n') + '.live/\n');
    generateRunners();
    console.log('⚡ TK Code Studio initialized. Run run_tk_studio.bat, ./run_tk_studio.sh, or: npm run live');
  } else if (cmd === 'start') {
    await start();
  } else if (cmd === 'pending') {
    const q = readQueue();
    console.log(q.items.length ? q.items.map(fmt).join('\n\n') : 'no pending changes');
  } else if (cmd === 'wait') {
    const deadline = Date.now() + Number(flag('timeout', 600)) * 1000;
    while (Date.now() < deadline) {
      const q = readQueue();
      if (q.ready && q.items.length) {
        q.ready = false; writeQueue(q);
        console.log(q.items.map(fmt).join('\n\n'));
        return;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log('timeout: no changes queued');
  } else if (cmd === 'done') {
    const ids = argv.slice(1);
    const q = readQueue();
    q.items = ids.length ? q.items.filter(i => !ids.includes(i.id)) : [];
    writeQueue(q);
    console.log('remaining:', q.items.length);
  } else {
    console.log('usage: live.mjs init | start [--target URL] [--port N] | wait | pending | done [ids]');
  }
}
main();

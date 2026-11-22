/* TK Code Studio overlay — injected by the local proxy. */
(() => {
  if (window.__liveEditLoaded) return;
  window.__liveEditLoaded = true;

  const TOKEN = window.__LIVE_TOKEN;
  const host = document.createElement('div');
  host.id = '__live-host';
  host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647';
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });

  root.innerHTML = `
  <style>
    *{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif}
    .box{position:fixed;pointer-events:none;border-radius:3px;display:none}
    #hover{outline:1.5px dashed #10b981;background:rgba(16,185,129,.06)}
    #sel{outline:2px solid #10b981;background:rgba(16,185,129,.08);pointer-events:none}
    .handle{position:absolute;background:#10b981;border:1.5px solid #fff;border-radius:2px;pointer-events:auto;z-index:9999}
    .handle-r{right:-4px;top:50%;transform:translateY(-50%);width:7px;height:18px;cursor:ew-resize}
    .handle-b{bottom:-4px;left:50%;transform:translateX(-50%);width:18px;height:7px;cursor:ns-resize}
    .handle-se{right:-4px;bottom:-4px;width:9px;height:9px;border-radius:50%;cursor:nwse-resize}
    #tag{position:fixed;display:none;background:#10b981;color:#fff;font-size:11px;padding:2px 6px;border-radius:3px;pointer-events:none;white-space:nowrap}
    #size-pill{position:fixed;display:none;background:#111827;color:#10b981;font-weight:600;font-size:11px;padding:3px 7px;border-radius:4px;border:1px solid #10b981;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.5);z-index:99999}
    .bar{position:fixed;pointer-events:auto;display:flex;gap:4px;padding:4px;background:#111827;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.35);align-items:center}
    #tools{display:none}
    button{all:unset;cursor:pointer;color:#e5e7eb;font-size:12px;padding:5px 9px;border-radius:5px;white-space:nowrap;transition:background .15s}
    button:hover{background:#374151}
    button.primary{background:#10b981;color:#fff}button.primary:hover{background:#059669}
    button.danger:hover{background:#b91c1c}
    .brand-badge{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:#f3f4f6;padding:3px 8px;border-radius:5px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);white-space:nowrap;letter-spacing:.3px}
    .brand-icon{color:#10b981;font-size:13px}
    #active-el-pill{color:#a7f3d0;font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;padding:3px 8px;border-radius:5px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.25);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #active-el-pill .dim{color:#94a3b8;font-size:10px;margin-left:4px}
    .native-picker{position:absolute;opacity:0;pointer-events:none;width:0;height:0}
    .mode-toggle{display:flex;align-items:center;gap:6px;font-weight:600;padding:5px 11px;border-radius:6px;transition:all .15s ease}
    .mode-toggle.on{background:#059669;color:#fff}
    .mode-toggle.on:hover{background:#047857}
    .mode-toggle.off{background:#374151;color:#9ca3af}
    .mode-toggle.off:hover{background:#4b5563;color:#f3f4f6}
    .mode-dot{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 8px #34d399;transition:all .15s ease}
    .mode-toggle.off .mode-dot{background:#6b7280;box-shadow:none}
    #main{left:50%;bottom:18px;transform:translateX(-50%);align-items:center;padding:5px 6px;transition:all .2s ease;z-index:999999}
    #main.mode-off .edit-only{display:none}
    .sep{width:1px;background:#374151;margin:2px 2px}
    #count{color:#9ca3af;font-size:12px;padding:0 6px}
    #list{position:fixed;left:50%;bottom:62px;transform:translateX(-50%);width:340px;max-height:260px;overflow:auto;background:#111827;color:#d1d5db;border-radius:8px;padding:8px;font-size:12px;display:none;pointer-events:auto;box-shadow:0 6px 24px rgba(0,0,0,.35)}
    #list div{padding:5px 6px;border-bottom:1px solid #1f2937}
    #result{position:fixed;right:16px;bottom:16px;width:380px;max-height:55vh;overflow:auto;background:#111827;color:#d1d5db;border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.45;display:none;pointer-events:auto;box-shadow:0 8px 30px rgba(0,0,0,.4)}
    #result h4{margin:0 0 6px;font-size:12px;color:#fff;display:flex;justify-content:space-between;align-items:center}
    #result .ok{color:#86efac}#result .warn{color:#fcd34d}#result .mut{color:#9ca3af;word-break:break-all}
    #result div.row{padding:4px 0;border-top:1px solid #1f2937}
    #toast{position:fixed;left:50%;bottom:72px;transform:translateX(-50%);background:#111827;color:#fff;font-size:12px;padding:8px 12px;border-radius:8px;display:none;max-width:420px}
  </style>
  <div id="hover" class="box"></div>
  <div id="sel" class="box">
    <div class="handle handle-r" title="Drag to adjust width"></div>
    <div class="handle handle-b" title="Drag to adjust height"></div>
    <div class="handle handle-se" title="Drag to adjust width & height"></div>
  </div>
  <div id="tag"></div>
  <div id="size-pill"></div>
  <div id="tools" class="bar"></div>
  <div id="list"></div>
  <div id="result"></div>
  <div id="toast"></div>
  <input type="color" id="native-color" class="native-picker" value="#10b981">
  <input type="color" id="native-bg" class="native-picker" value="#141417">
  <div id="main" class="bar">
    <div class="brand-badge"><span class="brand-icon">⚡</span><span>TK Code Studio</span></div>
    <span class="sep"></span>
    <button id="toggle" class="mode-toggle on" title="Toggle Edit Mode (Alt+E)"><span class="mode-dot"></span><span id="toggle-label">Edit: ON</span></button>
    <span class="sep edit-only"></span>
    <span id="active-el-pill" class="edit-only">Click element to edit</span>
    <span class="sep edit-only"></span>
    <button id="undo" class="edit-only" title="Undo Last Change (Ctrl+Z)">Undo</button>
    <button id="cnt" class="edit-only" title="View Pending Changes"><span id="count">0 changes</span></button>
    <span class="sep edit-only"></span>
    <button id="save" class="primary edit-only" title="Save to Code (Ctrl+S)">Save to code</button>
  </div>`;
  const $ = s => root.querySelector(s);
  const hoverBox = $('#hover'), selBox = $('#sel'), tagEl = $('#tag'), tools = $('#tools'), activeElPill = $('#active-el-pill');
  const colorInput = $('#native-color'), bgInput = $('#native-bg');

  let on = true, hovered = null, selected = null, editing = null;
  const textChanges = new Map();   // key -> {old,new,selector,html}
  const ops = [];                  // structural changes
  const editedEls = new Set();     // elements whose text baseline resets after a save
  const undoStack = [];
  const ids = new WeakMap(); let nextId = 1;
  const idOf = el => { if (!ids.has(el)) ids.set(el, nextId++); return ids.get(el); };
  const inUI = t => t === host || host.contains(t);

  function cssPath(el) {
    const parts = [];
    while (el && el.nodeType === 1 && el !== document.body && parts.length < 7) {
      if (el.id) { parts.unshift('#' + el.id); break; }
      let s = el.tagName.toLowerCase();
      const cls = [...el.classList].slice(0, 2).join('.');
      if (cls) s += '.' + cls;
      const sib = el.parentElement ? [...el.parentElement.children].filter(c => c.tagName === el.tagName) : [];
      if (sib.length > 1) s += `:nth-of-type(${sib.indexOf(el) + 1})`;
      parts.unshift(s); el = el.parentElement;
    }
    return parts.join(' > ');
  }
  const html = el => el.outerHTML.replace(/\s+/g, ' ').slice(0, 1800);
  const txt = el => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const label = el => el.tagName.toLowerCase() + ([...el.classList][0] ? '.' + [...el.classList][0] : '');
  const isButton = el => el.matches('button,[role=button],input[type=submit],input[type=button],a.btn,a[class*=button],a[class*=btn]');
  const isInput = el => el.matches('input,textarea,select');
  const isImage = el => el.matches('img,picture,image,figure,svg') || (el.style && el.style.backgroundImage && el.style.backgroundImage !== 'none');
  const isTextElement = el => el.matches('h1,h2,h3,h4,h5,h6,p,span,a,b,strong,i,em,small,sub,sup,label,li,blockquote');
  const sizePill = $('#size-pill');
  let resizing = false;
  const directTexts = el => [...el.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim()).map(n => n.nodeValue.trim().replace(/\s+/g, ' '));

  function toast(msg, ms = 3500) {
    const t = $('#toast'); t.textContent = msg; t.style.display = 'block';
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.style.display = 'none'), ms);
  }

  // ---- drawing ----
  function place(box, el) {
    if (!el || !el.isConnected) { box.style.display = 'none'; return; }
    const r = el.getBoundingClientRect();
    Object.assign(box.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  }
  function frame() {
    place(hoverBox, on && hovered !== selected ? hovered : null);
    place(selBox, selected);
    if (selected && selected.isConnected) {
      const r = selected.getBoundingClientRect();
      tagEl.textContent = label(selected); tagEl.style.display = 'block';
      tagEl.style.left = Math.max(4, r.left) + 'px'; tagEl.style.top = Math.max(4, r.top - 20) + 'px';
      tools.style.display = 'flex';
      const tw = tools.offsetWidth;
      tools.style.left = Math.min(Math.max(8, r.left), innerWidth - tw - 8) + 'px';
      tools.style.top = (r.bottom + 44 > innerHeight ? Math.max(8, r.top - 56) : r.bottom + 8) + 'px';
    } else { tagEl.style.display = 'none'; tools.style.display = 'none'; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- selection ----
  function updateElementPill() {
    if (!activeElPill) return;
    if (selected && selected.isConnected) {
      const r = selected.getBoundingClientRect();
      activeElPill.innerHTML = `&lt;${label(selected)}&gt; <span class="dim">${Math.round(r.width)}×${Math.round(r.height)}</span>`;
    } else {
      activeElPill.textContent = 'Click element to edit';
    }
  }

  function select(el) {
    if (editing) commitEdit();
    selected = el;
    buildTools();
    updateElementPill();
  }

  function buildTools() {
    tools.innerHTML = '';
    if (!selected) return;
    const add = (name, fn, cls = '', tip = '') => {
      const b = document.createElement('button');
      b.textContent = name;
      if (cls) b.className = cls;
      if (tip) b.title = tip;
      b.onclick = e => { e.stopPropagation(); fn(); };
      tools.appendChild(b);
    };
    add('Edit text', startEdit, '', 'Inline Text Edit (Double Click)');
    add('Size 📐', promptSize, '', 'Adjust Size / Presets (Alt+R)');
    add('Font 🔤', promptFontSize, '', 'Font & Icon Size');
    add('Color 🎨', triggerColorPicker, '', 'Dynamic Text Color (Alt+K)');
    add('BG 🖌️', triggerBgPicker, '', 'Dynamic Background Color (Alt+B)');
    add('Move ↑', moveUp, '', 'Move Element Up (Alt+↑)');
    add('Move ↓', moveDown, '', 'Move Element Down (Alt+↓)');
    if (isImage(selected)) add('Replace 📷', promptImageUpload, '', 'Replace Image Asset');
    add('Parent ↑', () => selected.parentElement && selected.parentElement !== document.documentElement && select(selected.parentElement), '', 'Select Parent (Alt+P)');
    add('Child ↓', () => selected.firstElementChild && select(selected.firstElementChild), '', 'Select Child (Alt+C)');
    add('Duplicate', duplicate, '', 'Duplicate Element (Ctrl+D)');
    if (isButton(selected)) add(isDisabled(selected) ? 'Enable' : 'Disable', toggleDisabled);
    add('Delete', del, 'danger', 'Delete Element (Del)');
  }

  function moveUp() {
    const el = selected;
    if (!el || !el.parentElement) return;
    const prev = el.previousElementSibling;
    if (!prev) return toast('Already first element in its container');
    const parent = el.parentElement;
    parent.insertBefore(el, prev);
    const op = { type: 'move', direction: 'before', targetSelector: cssPath(prev), ...meta(el) };
    ops.push(op);
    undoStack.push(() => {
      parent.insertBefore(prev, el);
      ops.splice(ops.indexOf(op), 1);
      refresh();
    });
    refresh();
    toast('Moved element up ↑');
  }

  function moveDown() {
    const el = selected;
    if (!el || !el.parentElement) return;
    const next = el.nextElementSibling;
    if (!next) return toast('Already last element in its container');
    const parent = el.parentElement;
    parent.insertBefore(next, el);
    const op = { type: 'move', direction: 'after', targetSelector: cssPath(next), ...meta(el) };
    ops.push(op);
    undoStack.push(() => {
      parent.insertBefore(el, next);
      ops.splice(ops.indexOf(op), 1);
      refresh();
    });
    refresh();
    toast('Moved element down ↓');
  }

  function applyStyle(prop, val, msg) {
    const el = selected; if (!el) return;
    const prev = el.style[prop];
    const prevStyle = el.getAttribute('style') || '';
    el.style[prop] = val;
    const op = { type: 'style', property: prop, value: val, style: el.getAttribute('style'), ...meta(el) };
    ops.push(op);
    undoStack.push(() => {
      if (prevStyle) el.setAttribute('style', prevStyle);
      else el.style[prop] = prev;
      ops.splice(ops.indexOf(op), 1);
      refresh();
    });
    refresh();
    if (msg) toast(`🎨 ${msg}`);
  }

  function rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '#10b981';
    if (rgb.startsWith('#')) return rgb.length === 4 ? '#' + rgb[1]+rgb[1]+rgb[2]+rgb[2]+rgb[3]+rgb[3] : rgb.slice(0, 7);
    const m = rgb.match(/\d+/g);
    if (!m || m.length < 3) return '#10b981';
    return '#' + ((1 << 24) + (parseInt(m[0]) << 16) + (parseInt(m[1]) << 8) + parseInt(m[2])).toString(16).slice(1);
  }

  function triggerColorPicker() {
    if (!selected) return;
    const cur = window.getComputedStyle(selected).color;
    colorInput.value = rgbToHex(cur);
    const prevColor = selected.style.color;
    const prevStyle = selected.getAttribute('style') || '';

    colorInput.oninput = ev => {
      selected.style.color = ev.target.value;
    };

    colorInput.onchange = ev => {
      const val = ev.target.value;
      selected.style.color = val;
      const op = { type: 'style', property: 'color', value: val, style: selected.getAttribute('style'), ...meta(selected) };
      ops.push(op);
      undoStack.push(() => {
        if (prevStyle) selected.setAttribute('style', prevStyle);
        else selected.style.color = prevColor;
        ops.splice(ops.indexOf(op), 1);
        refresh();
      });
      refresh();
      toast(`🎨 Text color set to ${val}`);
    };

    colorInput.click();
  }

  function triggerBgPicker() {
    if (!selected) return;
    const cur = window.getComputedStyle(selected).backgroundColor;
    bgInput.value = rgbToHex(cur);
    const prevBg = selected.style.backgroundColor;
    const prevStyle = selected.getAttribute('style') || '';

    bgInput.oninput = ev => {
      selected.style.backgroundColor = ev.target.value;
    };

    bgInput.onchange = ev => {
      const val = ev.target.value;
      selected.style.backgroundColor = val;
      const op = { type: 'style', property: 'backgroundColor', value: val, style: selected.getAttribute('style'), ...meta(selected) };
      ops.push(op);
      undoStack.push(() => {
        if (prevStyle) selected.setAttribute('style', prevStyle);
        else selected.style.backgroundColor = prevBg;
        ops.splice(ops.indexOf(op), 1);
        refresh();
      });
      refresh();
      toast(`🖌️ Background set to ${val}`);
    };

    bgInput.click();
  }

  function promptFontSize() {
    if (!selected) return;
    const cur = parseInt(window.getComputedStyle(selected).fontSize) || 16;
    const choice = prompt(
      `Adjust Font / Text / Icon Size (Current: ${cur}px):\n` +
      `1 = A- (-2px -> ${cur - 2}px)\n` +
      `2 = A+ (+2px -> ${cur + 2}px)\n` +
      `3 = Small (12px)\n` +
      `4 = Normal (16px)\n` +
      `5 = Large (20px)\n` +
      `6 = Extra Large (28px)\n` +
      `7 = Huge Headline (40px)\n` +
      `Or enter custom size (e.g. "24px"):`,
      `${cur}px`
    );
    if (!choice) return;
    let newSize = '';
    const c = choice.trim().toLowerCase();
    if (c === '1' || c === 'a-') newSize = `${Math.max(8, cur - 2)}px`;
    else if (c === '2' || c === 'a+') newSize = `${cur + 2}px`;
    else if (c === '3') newSize = '12px';
    else if (c === '4') newSize = '16px';
    else if (c === '5') newSize = '20px';
    else if (c === '6') newSize = '28px';
    else if (c === '7') newSize = '40px';
    else newSize = choice.trim();
    applyStyle('fontSize', newSize, `Size set to ${newSize}`);
  }

  function promptImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      if (!input.files || !input.files[0]) return;
      const file = input.files[0];
      toast('📤 Uploading image asset...', 5000);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/__live/upload-asset', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-live-token': TOKEN },
            body: JSON.stringify({ name: file.name, data: reader.result })
          });
          const d = await res.json();
          if (!d.ok) throw new Error(d.error || 'Upload failed');
          const targetEl = selected;
          const oldSrc = targetEl.tagName.toLowerCase() === 'img' ? (targetEl.getAttribute('src') || '') : (targetEl.style.backgroundImage || '');
          const newSrc = d.url;
          if (targetEl.tagName.toLowerCase() === 'img') targetEl.src = newSrc;
          else targetEl.style.backgroundImage = `url('${newSrc}')`;
          const op = { type: 'asset_swap', oldSrc, newSrc, ...meta(targetEl) };
          ops.push(op);
          undoStack.push(() => {
            if (targetEl.tagName.toLowerCase() === 'img') targetEl.src = oldSrc;
            else targetEl.style.backgroundImage = oldSrc;
            ops.splice(ops.indexOf(op), 1);
            refresh();
          });
          refresh();
          toast(`📷 Replaced image with ${d.url}!`);
        } catch (err) {
          toast(`❌ Image upload failed: ${err.message}`);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function initAssetDrop() {
    window.addEventListener('dragover', e => {
      if (!on) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      const target = e.target;
      if (!inUI(target) && target.nodeType === 1) hovered = target;
    }, true);

    window.addEventListener('drop', async e => {
      if (!on || inUI(e.target)) return;
      const files = e.dataTransfer?.files;
      if (!files || !files.length) return;
      const file = files[0];
      if (!file.type.startsWith('image/')) return;
      e.preventDefault(); e.stopPropagation();

      const targetEl = selected || (e.target && !inUI(e.target) ? e.target : null);
      if (!targetEl || targetEl === document.body || targetEl === document.documentElement) return;

      toast('📤 Uploading image asset...', 5000);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/__live/upload-asset', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-live-token': TOKEN },
            body: JSON.stringify({ name: file.name, data: reader.result })
          });
          const d = await res.json();
          if (!d.ok) throw new Error(d.error || 'Upload failed');

          const oldSrc = targetEl.tagName.toLowerCase() === 'img' ? (targetEl.getAttribute('src') || '') : (targetEl.style.backgroundImage || '');
          const newSrc = d.url;

          if (targetEl.tagName.toLowerCase() === 'img') {
            targetEl.src = newSrc;
          } else {
            targetEl.style.backgroundImage = `url('${newSrc}')`;
          }

          const op = { type: 'asset_swap', oldSrc, newSrc, ...meta(targetEl) };
          ops.push(op);
          undoStack.push(() => {
            if (targetEl.tagName.toLowerCase() === 'img') targetEl.src = oldSrc;
            else targetEl.style.backgroundImage = oldSrc;
            ops.splice(ops.indexOf(op), 1);
            refresh();
          });
          select(targetEl);
          refresh();
          toast(`📷 Replaced image with ${d.url}! Click "Save to code" to persist.`);
        } catch (err) {
          toast(`❌ Image upload failed: ${err.message}`);
        }
      };
      reader.readAsDataURL(file);
    }, true);
  }

  function promptSize() {
    if (!selected) return;
    const tag = selected.tagName.toLowerCase();
    const rect = selected.getBoundingClientRect();
    const curW = Math.round(rect.width);
    const curH = Math.round(rect.height);

    if (isButton(selected) || isInput(selected)) {
      const choice = prompt(
        `Adjust Size for <${tag}> (${curW}px × ${curH}px):\n` +
        `1 = Small (padding: 4px 10px / height: 32px)\n` +
        `2 = Medium (padding: 8px 16px / height: 42px)\n` +
        `3 = Large (padding: 12px 24px / height: 50px)\n` +
        `4 = Full Width (width: 100%)\n` +
        `5 = Auto (natural size)\n` +
        `Or enter custom "width height" (e.g. "280px 44px"):`,
        `${curW}px ${curH}px`
      );
      if (!choice) return;

      let newW = '', newH = '', newPad = '';
      const c = choice.trim().toLowerCase();
      if (c === '1' || c === 'sm') { newPad = '4px 10px'; newH = '32px'; }
      else if (c === '2' || c === 'md') { newPad = '8px 16px'; newH = '42px'; }
      else if (c === '3' || c === 'lg') { newPad = '12px 24px'; newH = '50px'; }
      else if (c === '4' || c === 'full') { newW = '100%'; }
      else if (c === '5' || c === 'auto') { newW = 'auto'; newH = 'auto'; newPad = ''; }
      else {
        const parts = choice.trim().split(/\s+/);
        newW = parts[0] || 'auto';
        newH = parts[1] || 'auto';
      }
      applyElementSize(newW, newH, newPad);
    } else {
      const choice = prompt(
        `Adjust Box Size for <${tag}> (${curW}px × ${curH}px):\n` +
        `1 = Full Width (100%)\n` +
        `2 = Half Width (50%)\n` +
        `3 = Card Box (380px)\n` +
        `4 = Auto (fit content)\n` +
        `Or enter custom "width height" (e.g. "500px 320px"):`,
        `${curW}px ${curH}px`
      );
      if (!choice) return;

      let newW = '', newH = '';
      const c = choice.trim().toLowerCase();
      if (c === '1' || c === 'full') newW = '100%';
      else if (c === '2') newW = '50%';
      else if (c === '3') newW = '380px';
      else if (c === '4' || c === 'auto') { newW = 'auto'; newH = 'auto'; }
      else {
        const parts = choice.trim().split(/\s+/);
        newW = parts[0] || 'auto';
        newH = parts[1] || 'auto';
      }
      applyElementSize(newW, newH, '');
    }
  }

  function applyElementSize(w, h, padding) {
    const el = selected; if (!el) return;
    const prevStyle = el.getAttribute('style') || '';
    const prevW = el.style.width;
    const prevH = el.style.height;
    const prevPad = el.style.padding;

    if (w) el.style.width = w;
    if (h) el.style.height = h;
    if (padding) el.style.padding = padding;

    const op = {
      type: 'resize',
      width: el.style.width || w,
      height: el.style.height || h,
      padding: el.style.padding || padding,
      style: el.getAttribute('style'),
      ...meta(el)
    };
    ops.push(op);

    undoStack.push(() => {
      if (prevStyle) el.setAttribute('style', prevStyle);
      else { el.style.width = prevW; el.style.height = prevH; el.style.padding = prevPad; }
      ops.splice(ops.indexOf(op), 1);
      refresh();
    });

    refresh();
    toast(`📐 Updated size on <${el.tagName.toLowerCase()}> to ${el.style.width || w} × ${el.style.height || h}`);
  }

  function initResizeHandles() {
    const handles = selBox.querySelectorAll('.handle');
    handles.forEach(h => {
      h.addEventListener('mousedown', e => {
        if (!selected) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        resizing = true;
        const startX = e.clientX;
        const startY = e.clientY;
        const rect = selected.getBoundingClientRect();
        const startW = rect.width;
        const startH = rect.height;
        const prevStyle = selected.getAttribute('style') || '';
        const prevW = selected.style.width;
        const prevH = selected.style.height;

        const isR = h.classList.contains('handle-r');
        const isB = h.classList.contains('handle-b');
        const isSE = h.classList.contains('handle-se');

        let currentW = Math.round(startW);
        let currentH = Math.round(startH);

        const onMouseMove = ev => {
          if (!resizing) return;
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;

          if (isR || isSE) {
            currentW = Math.max(16, Math.round(startW + dx));
            selected.style.width = currentW + 'px';
          }
          if (isB || isSE) {
            currentH = Math.max(16, Math.round(startH + dy));
            selected.style.height = currentH + 'px';
          }

          const currentRect = selected.getBoundingClientRect();
          sizePill.textContent = `${currentW}px × ${currentH}px`;
          sizePill.style.display = 'block';
          sizePill.style.left = (currentRect.right - 40) + 'px';
          sizePill.style.top = (currentRect.bottom + 8) + 'px';
        };

        const onMouseUp = () => {
          if (!resizing) return;
          resizing = false;
          window.removeEventListener('mousemove', onMouseMove, true);
          window.removeEventListener('mouseup', onMouseUp, true);
          sizePill.style.display = 'none';

          if (currentW === Math.round(startW) && currentH === Math.round(startH)) return;

          const wStr = selected.style.width;
          const hStr = selected.style.height;
          const op = {
            type: 'resize',
            width: wStr,
            height: hStr,
            style: selected.getAttribute('style'),
            ...meta(selected)
          };
          ops.push(op);

          undoStack.push(() => {
            if (prevStyle) selected.setAttribute('style', prevStyle);
            else { selected.style.width = prevW; selected.style.height = prevH; }
            ops.splice(ops.indexOf(op), 1);
            refresh();
          });

          refresh();
          toast(`📐 Resized <${selected.tagName.toLowerCase()}> to ${wStr} × ${hStr}`);
        };

        window.addEventListener('mousemove', onMouseMove, true);
        window.addEventListener('mouseup', onMouseUp, true);
      }, true);
    });
  }

  document.addEventListener('mousemove', e => { if (on && !inUI(e.target)) hovered = e.target; }, true);
  document.addEventListener('click', e => {
    if (!on || inUI(e.target)) return;
    if (editing && editing.contains(e.target)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (e.target === document.documentElement || e.target === document.body) return select(null);
    select(e.target);
  }, true);
  document.addEventListener('dblclick', e => { if (on && !inUI(e.target)) { e.preventDefault(); select(e.target); startEdit(); } }, true);
  document.addEventListener('submit', e => { if (on) e.preventDefault(); }, true);

  // ---- text editing ----
  function startEdit() {
    const el = selected; if (!el) return;
    const texts = directTexts(el);
    if (!texts.length) return toast('No text here — use Child ↓ to pick the element holding the text.');
    if (!el.__liveOrig) el.__liveOrig = texts;
    editing = el; el.__before = texts;
    el.contentEditable = 'true'; el.focus();
    const rng = document.createRange(); rng.selectNodeContents(el);
    const s = getSelection(); s.removeAllRanges(); s.addRange(rng);
    el.addEventListener('keydown', editKeys); el.addEventListener('paste', pastePlain);
    el.addEventListener('blur', commitEdit, { once: true });
  }
  const editKeys = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editing && editing.blur(); }
    if (e.key === 'Escape') { e.preventDefault(); editing.__cancel = true; editing.blur(); }
    e.stopPropagation();
  };
  const pastePlain = e => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); };
  function commitEdit() {
    const el = editing; if (!el) return; editing = null;
    el.removeEventListener('keydown', editKeys); el.removeEventListener('paste', pastePlain);
    el.removeAttribute('contenteditable');
    const orig = el.__liveOrig, before = el.__before, cur = directTexts(el);
    if (el.__cancel) { el.__cancel = false; revertTexts(el, before); return; }
    const key0 = String(idOf(el)), prefix = key0 + ':';
    const prev = [...textChanges].filter(([k]) => k.startsWith(prefix));
    prev.forEach(([k]) => textChanges.delete(k));
    editedEls.add(el);
    const base = { selector: cssPath(el), html: html(el), ctx: context(el, orig.concat(cur)) };
    if (cur.length === orig.length) {
      cur.forEach((t, i) => { if (t !== orig[i]) textChanges.set(prefix + i, { old: orig[i], new: t, ...base }); });
    } else {
      // The browser merged/split text nodes (React splits "… {n} …"). Diff by words.
      const a = orig.join(' ').split(/\s+/), b = cur.join(' ').split(/\s+/);
      let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++;
      let s = 0; while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
      let lo = p, ao = a.length - s, bo = b.length - s;
      if (lo === ao) { if (lo > 0) lo--; else if (ao < a.length) { ao++; bo++; } }   // pure insertion: add a context word
      const o = a.slice(lo, ao).join(' '), n = b.slice(lo, bo).join(' ');
      if (o && o !== n) textChanges.set(prefix + 'span', { old: o, new: n, ...base });
    }
    undoStack.push(() => {
      revertTexts(el, before);
      [...textChanges.keys()].filter(k => k.startsWith(prefix)).forEach(k => textChanges.delete(k));
      prev.forEach(([k, v]) => textChanges.set(k, v));
    });
    refresh();
  }
  function revertTexts(el, texts) {
    const nodes = [...el.childNodes].filter(n => n.nodeType === 3 && n.nodeValue.trim());
    if (nodes.length === texts.length) nodes.forEach((n, i) => { n.nodeValue = texts[i]; });
    else if (!el.children.length) el.textContent = texts.join(' ');
  }
  // Texts of the surrounding card, used server-side to find the right place in source.
  function context(el, own) {
    let p = el.parentElement, depth = 0;
    while (p && p !== document.body && depth < 5) {
      const leaves = [...p.querySelectorAll('*')].filter(n => n !== el && directTexts(n).length);
      if (leaves.length >= 2) {
        const out = [];
        for (const n of leaves) for (const t of directTexts(n)) if (t.length > 2 && t.length < 140 && !own.includes(t) && !out.includes(t)) out.push(t);
        return out.slice(0, 10);
      }
      p = p.parentElement; depth++;
    }
    return [];
  }

  // ---- structural ops ----
  const meta = el => ({ tag: el.tagName.toLowerCase(), text: txt(el), selector: cssPath(el), html: html(el), parentText: el.parentElement ? [...el.parentElement.children].slice(0, 6).map(txt) : [] });

  function duplicate() {
    const el = selected; if (!el || !el.parentElement) return;
    const clone = el.cloneNode(true);
    el.after(clone);
    const op = { type: 'duplicate', ...meta(el) }; ops.push(op);
    undoStack.push(() => { clone.remove(); ops.splice(ops.indexOf(op), 1); select(el); });
    select(clone); refresh(); toast('Card duplicated. Edit its text, then Save.');
  }
  function del() {
    const el = selected; if (!el || !el.parentElement) return;
    const parent = el.parentElement, next = el.nextSibling;
    const op = { type: 'delete', ...meta(el) }; ops.push(op);
    el.remove(); select(null);
    undoStack.push(() => { parent.insertBefore(el, next); ops.splice(ops.indexOf(op), 1); select(el); });
    refresh();
  }
  const isDisabled = el => el.disabled === true || el.getAttribute('aria-disabled') === 'true';
  function toggleDisabled() {
    const el = selected; const now = !isDisabled(el);
    const apply = v => { if ('disabled' in el) el.disabled = v; el.setAttribute('aria-disabled', String(v)); el.style.opacity = v ? '.5' : ''; };
    apply(now);
    const op = { type: 'attr', name: 'disabled', value: now, ...meta(el) }; ops.push(op);
    undoStack.push(() => { apply(!now); ops.splice(ops.indexOf(op), 1); buildTools(); });
    buildTools(); refresh();
  }

  // ---- change list / save ----
  function refresh() {
    const n = textChanges.size + ops.length;
    $('#count').textContent = n + (n === 1 ? ' change' : ' changes');
    const list = $('#list');
    const opLabel = o => {
      if (o.type === 'resize') return `resize: &lt;${o.tag}&gt; ${esc(o.width || '')} × ${esc(o.height || '')}`;
      if (o.type === 'asset_swap') return `image: ${esc(o.newSrc || '')}`;
      if (o.type === 'move') return `move: &lt;${o.tag}&gt; (${o.direction})`;
      if (o.type === 'style') return `style: &lt;${o.tag}&gt; ${o.property}=${esc(o.value)}`;
      if (o.type === 'attr') return `attr: &lt;${o.tag}&gt; ${o.name}=${o.value}`;
      return `${o.type}: &lt;${o.tag}&gt; ${esc((o.text || '').slice(0, 40))}`;
    };
    list.innerHTML = [...textChanges.values()].map(c => `<div>text: “${esc(c.old)}” → “${esc(c.new)}”</div>`).concat(ops.map(o => `<div>${opLabel(o)}</div>`)).join('') || '<div>No pending changes</div>';
    buildTools();
  }
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  async function save() {
    if (editing) commitEdit();
    if (!textChanges.size && !ops.length) return toast('Nothing to save.');
    try {
      const r = await fetch('/__live/save', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-live-token': TOKEN },
        body: JSON.stringify({ edits: [...textChanges.values()], ops, page: location.pathname })
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      showResult(d);
      try { sessionStorage.setItem('__liveLast', JSON.stringify({ d, t: Date.now() })); } catch {}
      textChanges.clear(); ops.length = 0; undoStack.length = 0;
      editedEls.forEach(el => { if (el.isConnected) el.__liveOrig = directTexts(el); });
      editedEls.clear();
      refresh();
    } catch (e) { showResult({ error: e.message }); }
  }

  // Persistent panel: survives HMR/full reloads (restored from sessionStorage) until dismissed.
  function showResult(d) {
    const el = $('#result');
    const head = (t) => `<h4><span>${t}</span><button id="rx">✕</button></h4>`;
    let h;
    if (d.error) {
      h = head('Save failed') + `<div class="warn">${esc(d.error)}</div><div class="mut">Is <code>npm run live</code> still running in your terminal?</div>`;
    } else {
      h = head(`${d.applied.length} written to source · ${d.queued.length} queued`);
      h += d.applied.map(a => `<div class="row"><span class="ok">✓</span> ${esc(a.file)}:${a.line}<div class="mut">“${esc(a.old)}” → “${esc(a.new)}”</div></div>`).join('');
      h += d.queued.map(q => `<div class="row"><span class="warn">⚠ ${esc(q.type)}${q.reason ? ' — ' + esc(q.reason) : ''}</span><div class="mut">${q.old != null ? '“' + esc(q.old) + '”' : '&lt;' + esc(q.tag || '') + '&gt; ' + esc((q.text || '').slice(0, 60))}${q.candidates && q.candidates.length ? '<br>candidates: ' + esc(q.candidates.join(', ')) : ''}</div></div>`).join('');
      if (d.queued.length) h += `<div class="row warn">Queued items are NOT in your code yet. In Antigravity say: <b>apply tk-code-studio changes</b> (the agent runs <code>live.mjs wait</code>).</div>`;
      if (!d.applied.length && d.queued.some(q => q.reason === 'notfound')) h += `<div class="row mut">Searched ${d.scanned} files in ${esc(d.root)}. If that's the wrong folder, restart <code>npm run live</code> from your project root. If the text comes from a CMS/database/API, it isn't in the code.</div>`;
    }
    el.innerHTML = h; el.style.display = 'block';
    el.querySelector('#rx').onclick = () => { el.style.display = 'none'; try { sessionStorage.removeItem('__liveLast'); } catch {} };
  }
  try { const s = JSON.parse(sessionStorage.getItem('__liveLast') || 'null'); if (s && Date.now() - s.t < 120000) showResult(s.d); } catch {}

  function setEditMode(state) {
    on = Boolean(state);
    const btn = $('#toggle');
    const lbl = $('#toggle-label');
    const mainBar = $('#main');
    btn.classList.toggle('on', on);
    btn.classList.toggle('off', !on);
    if (mainBar) mainBar.classList.toggle('mode-off', !on);
    if (lbl) lbl.textContent = on ? 'Edit: ON' : 'Edit: OFF';
    if (!on) {
      select(null);
      hovered = null;
      hoverBox.style.display = 'none';
      selBox.style.display = 'none';
      tagEl.style.display = 'none';
      tools.style.display = 'none';
      toast('👁️ Browse Mode (Edit OFF) — Clicks navigate normally. Press Alt+E to edit.', 2500);
    } else {
      toast('✏️ Edit Mode ON — Click or double-click elements to edit. Press Alt+E to browse.', 2500);
    }
  }

  $('#save').onclick = save;
  $('#undo').onclick = () => { const f = undoStack.pop(); if (f) { f(); refresh(); } };
  $('#cnt').onclick = () => { const l = $('#list'); l.style.display = l.style.display === 'block' ? 'none' : 'block'; };
  $('#toggle').onclick = () => setEditMode(!on);
  document.addEventListener('keydown', e => {
    // Mode toggle
    if ((e.altKey && (e.key === 'e' || e.key === 'E')) || (e.ctrlKey && e.shiftKey && (e.key === 'e' || e.key === 'E'))) {
      e.preventDefault();
      setEditMode(!on);
      return;
    }
    if (!on) return;

    // Save
    if ((e.metaKey || e.ctrlKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault(); save(); return;
    }
    // Undo
    if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !editing) {
      e.preventDefault(); $('#undo').click(); return;
    }
    // Duplicate
    if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D') && selected && !editing) {
      e.preventDefault(); duplicate(); return;
    }
    // Delete
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !editing) {
      e.preventDefault(); del(); return;
    }
    // Move up
    if (e.altKey && e.key === 'ArrowUp' && selected && !editing) {
      e.preventDefault(); moveUp(); return;
    }
    // Move down
    if (e.altKey && e.key === 'ArrowDown' && selected && !editing) {
      e.preventDefault(); moveDown(); return;
    }
    // Parent
    if (e.altKey && (e.key === 'p' || e.key === 'P') && selected && !editing) {
      e.preventDefault();
      if (selected.parentElement && selected.parentElement !== document.documentElement) select(selected.parentElement);
      return;
    }
    // Child
    if (e.altKey && (e.key === 'c' || e.key === 'C') && selected && !editing) {
      e.preventDefault();
      if (selected.firstElementChild) select(selected.firstElementChild);
      return;
    }
    // Text color
    if (e.altKey && (e.key === 'k' || e.key === 'K') && selected && !editing) {
      e.preventDefault(); triggerColorPicker(); return;
    }
    // Background color
    if (e.altKey && (e.key === 'b' || e.key === 'B') && selected && !editing) {
      e.preventDefault(); triggerBgPicker(); return;
    }
    // Size tool
    if (e.altKey && (e.key === 'r' || e.key === 'R') && selected && !editing) {
      e.preventDefault(); promptSize(); return;
    }
    // Deselect
    if (e.key === 'Escape' && !editing) select(null);
  }, true);
  initResizeHandles();
  initAssetDrop();
  refresh();
})();

let _toolsMode = false;

function toggleToolsMode() {
  _toolsMode = !_toolsMode;
  document.querySelector('.workspace').classList.toggle('tools-mode', _toolsMode);
  document.getElementById('tools-ws').classList.toggle('active', _toolsMode);
  document.getElementById('tools-toggle-btn').classList.toggle('active', _toolsMode);
}

function showToolTab(name) {
  ['json','markdown','html','diff'].forEach(t => {
    document.getElementById('tp-'+t).classList.toggle('hidden', t !== name);
    document.getElementById('ttab-'+t).classList.toggle('active', t === name);
  });
}

// JSON tool
let _tjTimer     = null;
let _tjNodes     = [];
let _tjFormatted = '';

function autoFmtJSON() {
  clearTimeout(_tjTimer);
  _tjTimer = setTimeout(() => fmtJSON(2), 350);
}

function fmtJSON(indent) {
  const input = document.getElementById('tj-input').value.trim();
  const out   = document.getElementById('tj-out');
  _tjFormatted = ''; _tjNodes = [];
  if (!input) {
    out.innerHTML = '<span style="color:var(--text3)">el resultado aparecerá aquí…</span>';
    return;
  }
  try {
    const parsed = JSON.parse(input);
    _tjFormatted = JSON.stringify(parsed, null, indent);
    if (indent > 0) {
      out.innerHTML = '<pre>' + buildJSONHTML(parsed, 0, _tjNodes) + '</pre>';
    } else {
      out.innerHTML = '<pre>' + highlightJSON(_tjFormatted) + '</pre>';
    }
  } catch(e) {
    out.innerHTML = '<div class="tool-err">JSON inválido: ' + escT(e.message) + '</div>';
  }
}

function copyToolJSON() {
  if (!_tjFormatted) return;
  navigator.clipboard.writeText(_tjFormatted).catch(()=>{});
  const btn = document.getElementById('tj-copy-btn');
  btn.textContent = '✓ copiado';
  setTimeout(() => btn.textContent = 'copiar', 1500);
}

// --- context menu: right-click copy of any object/array node ---
function closeTjCtxMenu() {
  const menu = document.getElementById('tj-ctx-menu');
  menu.style.display = 'none';
  menu._copyVal = null;
}

function tjCopyCtxNode() {
  const menu = document.getElementById('tj-ctx-menu');
  if (!menu._copyVal) return;
  navigator.clipboard.writeText(JSON.stringify(menu._copyVal, null, 2)).catch(()=>{});
  closeTjCtxMenu();
}

document.getElementById('tj-out').addEventListener('contextmenu', e => {
  const jc = e.target.closest('.jc[data-jni]');
  if (!jc) return;
  e.preventDefault();
  const val = _tjNodes[parseInt(jc.dataset.jni, 10)];
  if (val == null) return;
  const isArr = Array.isArray(val);
  const count = isArr ? val.length : Object.keys(val).length;
  document.getElementById('tj-ctx-label').textContent = isArr
    ? `Copiar array [${count}]`
    : `Copiar objeto {${count}}`;
  const menu = document.getElementById('tj-ctx-menu');
  menu._copyVal = val;
  menu.style.display = 'block';
  menu.style.left = Math.min(e.clientX, window.innerWidth  - 210) + 'px';
  menu.style.top  = Math.min(e.clientY, window.innerHeight - 44)  + 'px';
});

document.addEventListener('mousedown', e => {
  const menu = document.getElementById('tj-ctx-menu');
  if (menu.style.display !== 'none' && !menu.contains(e.target)) closeTjCtxMenu();
});

// Markdown tool
let _tmTimer = null;

function renderMD() {
  clearTimeout(_tmTimer);
  _tmTimer = setTimeout(_renderMD, 200);
}

function _renderMD() {
  const input = document.getElementById('tm-input').value;
  const out   = document.getElementById('tm-out');
  if (!input.trim()) { out.innerHTML = '<span class="md-empty">el preview aparecerá aquí…</span>'; return; }
  out.innerHTML = parseMarkdown(input);
}

function copyMDHtml() {
  navigator.clipboard.writeText(document.getElementById('tm-out').innerHTML).catch(()=>{});
  const btn = document.getElementById('tm-copy-btn');
  btn.textContent = '✓ copiado';
  setTimeout(() => btn.textContent = 'copiar HTML', 1500);
}

function parseMarkdown(raw) {
  function inline(t) {
    return t
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,         '<em>$1</em>')
      .replace(/__(.+?)__/g,         '<strong>$1</strong>')
      .replace(/_([^_\s][^_]*)_/g,   '<em>$1</em>')
      .replace(/`([^`]+)`/g,         '<code class="md-ic">$1</code>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,  '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  const lines = raw.split('\n');
  let html = '', inCode = false, codeLines = [];
  let inUL = false, inOL = false, para = [];

  function flushPara()  { if (para.length) { html += '<p>' + para.join('<br>') + '</p>\n'; para = []; } }
  function closeLists() {
    flushPara();
    if (inUL) { html += '</ul>\n'; inUL = false; }
    if (inOL) { html += '</ol>\n'; inOL = false; }
  }

  for (const ln of lines) {
    if (ln.startsWith('```')) {
      if (!inCode) { closeLists(); inCode = true; codeLines = []; }
      else { inCode = false; html += '<pre class="md-pre"><code>' + codeLines.map(escT).join('\n') + '</code></pre>\n'; }
      continue;
    }
    if (inCode) { codeLines.push(ln); continue; }

    const t  = ln.trim();
    const hm = t.match(/^(#{1,6})\s+(.+)/);
    if (hm) { closeLists(); const l=hm[1].length; html+=`<h${l} class="md-h">${inline(escT(hm[2]))}</h${l}>\n`; continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t))  { closeLists(); html += '<hr class="md-hr">\n'; continue; }
    if (t.startsWith('>'))                  { closeLists(); html += `<blockquote class="md-bq">${inline(escT(t.slice(1).trim()))}</blockquote>\n`; continue; }

    const ulm = t.match(/^[-*+]\s+(.+)/);
    if (ulm) { flushPara(); if(inOL){html+='</ol>\n';inOL=false;} if(!inUL){html+='<ul>\n';inUL=true;} html+=`<li>${inline(escT(ulm[1]))}</li>\n`; continue; }
    const olm = t.match(/^\d+\.\s+(.+)/);
    if (olm) { flushPara(); if(inUL){html+='</ul>\n';inUL=false;} if(!inOL){html+='<ol>\n';inOL=true;} html+=`<li>${inline(escT(olm[1]))}</li>\n`; continue; }
    if (!t)  { closeLists(); continue; }
    if (inUL||inOL) closeLists();
    para.push(inline(escT(ln)));
  }
  closeLists();
  if (inCode) html += '<pre class="md-pre"><code>' + codeLines.map(escT).join('\n') + '</code></pre>\n';
  return html || '<span class="md-empty">nada que mostrar todavía…</span>';
}

// HTML tool
let _thTimer = null;

function previewHTML() {
  clearTimeout(_thTimer);
  _thTimer = setTimeout(() => {
    document.getElementById('th-iframe').srcdoc = document.getElementById('th-input').value || '';
  }, 300);
}

function openHTMLInWindow() {
  const html = document.getElementById('th-input').value;
  if (!html.trim()) return;
  const win = window.open('about:blank', '_blank', 'width=960,height=680');
  if (win) { win.document.open(); win.document.write(html); win.document.close(); }
}

// Vertical split handles
function initVSplit(handleId, leftId, rightId) {
  const handle = document.getElementById(handleId);
  const left   = document.getElementById(leftId);
  const right  = document.getElementById(rightId);
  if (!handle||!left||!right) return;
  let dragging=false, startX=0, startW=0;
  handle.addEventListener('mousedown', e => {
    dragging=true; startX=e.clientX; startW=left.offsetWidth;
    handle.classList.add('dragging'); document.body.classList.add('resizing-h'); e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const total = handle.parentElement.offsetWidth - handle.offsetWidth;
    const nw    = Math.max(120, Math.min(total-120, startW+(e.clientX-startX)));
    left.style.flex='none'; left.style.width=nw+'px';
    right.style.flex='1';   right.style.width='';
  });
  document.addEventListener('mouseup', () => {
    if (!dragging) return; dragging=false;
    handle.classList.remove('dragging'); document.body.classList.remove('resizing-h');
  });
}

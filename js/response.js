// --- JSON tree renderer ---
// nodeStore: optional array — when provided, each object/array node pushes its JS value
// and gets a data-jni attribute for right-click copy support
function buildJSONHTML(val, depth, nodeStore) {
  if (val === null) return '<span class="json-null">null</span>';
  if (typeof val === 'boolean') return `<span class="json-bool">${val}</span>`;
  if (typeof val === 'number')  return `<span class="json-num">${val}</span>`;
  if (typeof val === 'string')  return `<span class="json-str">"${escT(val)}"</span>`;

  const pad  = '  '.repeat(depth);
  const pad1 = '  '.repeat(depth + 1);

  let ni = '';
  if (nodeStore) { ni = ` data-jni="${nodeStore.length}"`; nodeStore.push(val); }

  if (Array.isArray(val)) {
    if (!val.length) return '[]';
    const lines = val.map((v, i) =>
      `${pad1}${buildJSONHTML(v, depth + 1, nodeStore)}${i < val.length - 1 ? ',' : ''}`
    ).join('\n');
    return `<span class="jc"${ni}><span class="jt" onclick="toggleJN(this)">▾</span><span class="jh">[${val.length}]</span><span class="jb">[\n${lines}\n${pad}]</span></span>`;
  }

  const keys = Object.keys(val);
  if (!keys.length) return '{}';
  const lines = keys.map((k, i) =>
    `${pad1}<span class="json-key">"${escT(k)}"</span>: ${buildJSONHTML(val[k], depth + 1, nodeStore)}${i < keys.length - 1 ? ',' : ''}`
  ).join('\n');
  return `<span class="jc"${ni}><span class="jt" onclick="toggleJN(this)">▾</span><span class="jh">{${keys.length}}</span><span class="jb">{\n${lines}\n${pad}}</span></span>`;
}

function toggleJN(btn) {
  const c = btn.closest('.jc');
  const b = c.querySelector(':scope > .jb');
  const h = c.querySelector(':scope > .jh');
  const open = b.style.display !== 'none';
  b.style.display = open ? 'none' : '';
  h.style.display = open ? 'inline' : 'none';
  btn.textContent = open ? '▸' : '▾';
}

function highlightJSON(str) {
  const e = str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return e.replace(
    /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    m => {
      if (m[0]==='"') return /:$/.test(m) ? `<span class="json-key">${m}</span>` : `<span class="json-str">${m}</span>`;
      if (m==='true'||m==='false') return `<span class="json-bool">${m}</span>`;
      if (m==='null') return `<span class="json-null">${m}</span>`;
      return `<span class="json-num">${m}</span>`;
    }
  );
}

function renderJSON(body) {
  try   { return buildJSONHTML(JSON.parse(body), 0); }
  catch { return highlightJSON(body); }
}

// --- response display ---
function showResponse(body, statusText, cls, ms, ctype, size, headers) {
  closeRespSearch();
  hasResp = true;
  // persist display state for tab switching
  respStatusText = statusText; respCls = cls; respMs = ms;
  respCtype = ctype; respSize = size; respHeaders = headers || {};

  document.getElementById('empty-state').style.display = 'none';
  const badge = document.getElementById('status-badge');
  badge.style.display = ''; badge.textContent = statusText; badge.className = 'status-badge '+cls;
  document.getElementById('resp-time').textContent    = ms    ? ms+'ms'       : '';
  document.getElementById('resp-ctype').textContent   = ctype || '';
  document.getElementById('resp-size').textContent    = size  ? fmtSize(size) : '';
  document.getElementById('resp-tabs').style.display      = '';
  document.getElementById('copy-btn').style.display       = '';
  document.getElementById('srch-open-btn').style.display  = '';
  document.getElementById('raw-btn').style.display        = isJSON ? '' : 'none';
  document.getElementById('raw-btn').textContent          = 'raw';
  const out = document.getElementById('response-output');
  out.style.display = ''; out.className = '';
  out.innerHTML = isJSON ? renderJSON(body) : escT(body);
  const hl      = document.getElementById('resp-headers-list');
  const entries = Object.entries(headers || {});
  hl.innerHTML  = entries.length
    ? entries.map(([k,v]) => `<div class="rh-row"><span class="rh-key">${escT(k)}</span><span class="rh-val">${escT(String(v))}</span></div>`).join('')
    : '<div class="empty-state">sin headers de respuesta</div>';
  showRespTab('body');
}

function showRespTab(name) {
  if (!hasResp) return;
  const isB = name === 'body';
  const isH = name === 'headers';
  const isT = name === 'tests';
  document.getElementById('response-output').style.display     = isB ? '' : 'none';
  document.getElementById('resp-headers-list').style.display   = isH ? '' : 'none';
  document.getElementById('resp-tests-list').style.display     = isT ? '' : 'none';
  document.getElementById('copy-btn').style.display            = isB ? '' : 'none';
  document.getElementById('srch-open-btn').style.display       = isB ? '' : 'none';
  document.getElementById('raw-btn').style.display             = (isB && isJSON) ? '' : 'none';
  document.getElementById('rtab-body').classList.toggle('active', isB);
  document.getElementById('rtab-headers').classList.toggle('active', isH);
  document.getElementById('rtab-tests').classList.toggle('active', isT);
  if (!isB) closeRespSearch();
}

function toggleRaw() {
  showRaw = !showRaw;
  const out = document.getElementById('response-output');
  const btn = document.getElementById('raw-btn');
  if (showRaw) { out.className='raw'; out.innerHTML=escT(rawBody);         btn.textContent='pretty'; }
  else         { out.className='';   out.innerHTML=renderJSON(prettyBody); btn.textContent='raw'; }
  const bar = document.getElementById('resp-search');
  if (bar.style.display !== 'none') execRespSearch();
}

function copyResponse() {
  const text = showRaw ? rawBody : prettyBody;
  navigator.clipboard.writeText(text).catch(()=>{});
  const btn = document.getElementById('copy-btn'); btn.textContent = '✓ copiado';
  setTimeout(() => btn.textContent = 'copiar', 1500);
}

function clearResponse() {
  closeRespSearch();
  hasResp = false; rawBody = ''; prettyBody = ''; isJSON = false; showRaw = false;
  respStatusText = ''; respCls = ''; respMs = 0; respCtype = ''; respSize = 0; respHeaders = {};
  document.getElementById('empty-state').style.display       = '';
  document.getElementById('response-output').style.display   = 'none';
  document.getElementById('resp-headers-list').style.display = 'none';
  document.getElementById('resp-tests-list').style.display   = 'none';
  document.getElementById('status-badge').style.display      = 'none';
  document.getElementById('resp-tabs').style.display         = 'none';
  document.getElementById('raw-btn').style.display           = 'none';
  document.getElementById('copy-btn').style.display          = 'none';
  document.getElementById('srch-open-btn').style.display     = 'none';
  document.getElementById('resp-ctype').textContent = '';
  document.getElementById('resp-time').textContent  = '';
  document.getElementById('resp-size').textContent  = '';
  const tb = document.getElementById('rtab-tests');
  if (tb) { tb.textContent = 'tests'; tb.style.color = ''; }
}

// --- response search ---
let _srchMatches = [];
let _srchIdx     = -1;

function openRespSearch() {
  if (!hasResp) return;
  const bar = document.getElementById('resp-search');
  bar.style.display = 'flex';
  const inp = document.getElementById('resp-search-input');
  inp.focus();
  inp.select();
}

function closeRespSearch() {
  const bar = document.getElementById('resp-search');
  if (bar.style.display === 'none') return;
  bar.style.display = 'none';
  document.getElementById('resp-search-input').value = '';
  document.getElementById('srch-count').textContent  = '';
  _srchMatches = [];
  _srchIdx     = -1;
  if (!hasResp) return;
  const out = document.getElementById('response-output');
  if (out.style.display === 'none') return;
  if (showRaw)     out.innerHTML = escT(rawBody);
  else if (isJSON) out.innerHTML = renderJSON(prettyBody);
  else             out.innerHTML = escT(prettyBody);
}

function _markText(container, query) {
  const lq   = query.toLowerCase();
  const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walk.nextNode())) nodes.push(n);
  nodes.forEach(node => {
    const text  = node.textContent;
    const lower = text.toLowerCase();
    if (lower.indexOf(lq) === -1) return;
    const frag = document.createDocumentFragment();
    let pos = 0, idx = lower.indexOf(lq);
    while (idx !== -1) {
      if (idx > pos) frag.appendChild(document.createTextNode(text.slice(pos, idx)));
      const m = document.createElement('mark');
      m.className   = 'srch-match';
      m.textContent = text.slice(idx, idx + query.length);
      frag.appendChild(m);
      pos = idx + query.length;
      idx = lower.indexOf(lq, pos);
    }
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    node.parentNode.replaceChild(frag, node);
  });
}

function execRespSearch() {
  const query = document.getElementById('resp-search-input').value;
  const out   = document.getElementById('response-output');
  if (showRaw)     out.innerHTML = escT(rawBody);
  else if (isJSON) out.innerHTML = renderJSON(prettyBody);
  else             out.innerHTML = escT(prettyBody);
  _srchMatches = [];
  _srchIdx     = -1;
  const q = query.trim();
  if (!q) { document.getElementById('srch-count').textContent = ''; return; }
  _markText(out, q);
  _srchMatches = Array.from(out.querySelectorAll('.srch-match'));
  if (_srchMatches.length) {
    _srchIdx = 0;
    _srchMatches[0].classList.add('srch-curr');
    _srchMatches[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    document.getElementById('srch-count').textContent = `1/${_srchMatches.length}`;
  } else {
    document.getElementById('srch-count').textContent = '0 resultados';
  }
}

function navRespSearch(dir) {
  if (!_srchMatches.length) return;
  _srchMatches[_srchIdx].classList.remove('srch-curr');
  _srchIdx = (_srchIdx + dir + _srchMatches.length) % _srchMatches.length;
  _srchMatches[_srchIdx].classList.add('srch-curr');
  _srchMatches[_srchIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  document.getElementById('srch-count').textContent = `${_srchIdx + 1}/${_srchMatches.length}`;
}
